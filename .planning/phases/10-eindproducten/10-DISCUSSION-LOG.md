# Phase 10: Eindproducten - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 10-eindproducten
**Areas discussed:** Export inhoud & structuur, DIN-overzicht visualisatie, Roadmap & tijdlijn, Gap-detectie & validatie

---

## Export inhoud & structuur

### Aanpak

| Option | Description | Selected |
|--------|-------------|----------|
| Bestaande verbeteren | Huidige secties behouden en verbeteren: Phase 8 consolidatie-data, genummerde kopjes, betere TOC | ✓ |
| Compleet herontwerpen | Secties herordenen, AI-narratief toevoegen, samenvoegen/splitsen | |
| Minimaal + AI-narratief | Data-secties houden + AI-verhalende management summary | |

**User's choice:** Bestaande verbeteren
**Notes:** Geen grote herstructurering nodig — de basis is goed.

### Consolidatie in export

| Option | Description | Selected |
|--------|-------------|----------|
| Geconsolideerd tonen | Samengevoegde items als één gedeeld item met sectorkoppelingen | ✓ |
| Beide tonen | Geconsolideerd in cross-analyse + originelen in sectorale uitwerking | |
| Alleen originelen | Consolidatie niet in export, altijd originele items | |

**User's choice:** Geconsolideerd tonen, met nadruk dat undo altijd mogelijk moet zijn in de app
**Notes:** "Mocht die consolidatie niet de juiste zijn, dat we altijd terug kunnen gaan en het opnieuw laten prompten of aanwijzingen geven"

### Kopjes nummering

| Option | Description | Selected |
|--------|-------------|----------|
| Automatische nummering | Genummerde headings (1., 1.1, 2., etc.) automatisch gegenereerd | ✓ |
| Huidige stijl behouden | Kopjes zonder nummering, TOC als losse lijst | |
| Je beslist | Claude kiest | |

**User's choice:** Automatische nummering

### AI-gegenereerde prose

| Option | Description | Selected |
|--------|-------------|----------|
| Verwijderen | /api/export route en generateProgrammaPlan() verwijderen | ✓ |
| Als management summary | AI-prose als management summary sectie in Word-document | |
| Apart document | AI-prose als alternatieve export naast Word | |

**User's choice:** Verwijderen

### Niet-uitgewerkte doelen

| Option | Description | Selected |
|--------|-------------|----------|
| Benoemen als 'volgt later' | Alle doelen opnemen, bij lege doelen "Uitwerking volgt in volgende cyclus" | ✓ |
| Alleen uitgewerkte doelen | Niet-uitgewerkte doelen weglaten | |
| Alle doelen, lege secties | Alle doelen met kopjes maar zonder inhoud | |

**User's choice:** Benoemen als 'volgt later'
**Notes:** Belangrijk context: gebruiker werkt cyclisch, één doel per keer (6-9 maanden per cyclus). Doel 2 en 3 worden nu niet uitgewerkt.

---

## DIN-overzicht visualisatie

### Visuele weergave

| Option | Description | Selected |
|--------|-------------|----------|
| Gestylede tabel-flow | Tabel per doel met kolommen Baat/Vermogen/Inspanning en pijl-symbolen | ✓ |
| Geneste inspringing | Huidige stijl maar visueler met kleur-labels en inspringende regels | |
| Samenvattings-matrix | Overzichtstabel hele programma: rijen=baten, kolommen=sectoren | |

**User's choice:** Gestylede tabel-flow

### Totaaloverzicht

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, beide | Per doel tabel-flow + compacte overzichtspagina | |
| Alleen per doel | Geen apart overzicht | ✓ |
| Je beslist | Claude kiest | |

**User's choice:** Alleen per doel — met cyclisch werken (één doel) is een helicopter-view niet nodig

### Sector-indeling

| Option | Description | Selected |
|--------|-------------|----------|
| Per sector apart | Aparte tabel per actieve sector per doel | ✓ |
| Gecombineerd | Alle sectoren in één tabel per doel | |
| Je beslist | Claude kiest | |

**User's choice:** Per sector apart

---

## Roadmap & tijdlijn

### Roadmap weergave

| Option | Description | Selected |
|--------|-------------|----------|
| Tijdlijn-tabel | Horizontale tabel kwartalen × domeinen | |
| Verbeterde kwartaaltabel | Huidige stijl verrijkt met afhankelijkheden | |
| Je beslist | Claude kiest | |

**User's choice:** Geen van bovenstaande — kwartaalplanning is een latere stap, niet relevant bij eerste uitwerking
**Notes:** "De kern is nu: baten, vermogens en inspanningen. Kwartaalplanning gaat pas gebeuren als besloten is welke vermogens en inspanningen we gaan uitvoeren."

### Sectie in document

| Option | Description | Selected |
|--------|-------------|----------|
| Tonen als beschikbaar | Roadmap-sectie tonen als kwartaaldata er is, anders overslaan | |
| Altijd skippen | Roadmap helemaal niet opnemen | |
| Lege placeholder | Altijd sectie tonen, bij lege data placeholder-tekst | ✓ |

**User's choice:** Lege placeholder — altijd sectie tonen met placeholder "Kwartaalplanning wordt in een volgende cyclus bepaald"

---

## Gap-detectie & validatie

### Waarschuwing vóór export

| Option | Description | Selected |
|--------|-------------|----------|
| Informatief overzicht | Gaps tonen, gebruiker kiest "Toch exporteren" of "Eerst aanvullen" | ✓ |
| Inline badges | Gap-badges direct in preview, geen apart scherm | |
| Blokkerend | Export blokkeren bij kritieke gaps | |

**User's choice:** Informatief overzicht — niet blokkeren

### Gaps in Word-document

| Option | Description | Selected |
|--------|-------------|----------|
| In document opnemen | Gap-analyse als sectie in het document | ✓ |
| Alleen in app | Gaps alleen als app-waarschuwing | |
| Optioneel | Checkbox bij export | |

**User's choice:** In document opnemen

### Cyclisch werken onderscheid

| Option | Description | Selected |
|--------|-------------|----------|
| Onderscheid maken | Niet-gestarte doelen als "Volgende cyclus" (neutraal), onvolledige ketens als echte gap (waarschuwing) | ✓ |
| Alles als gap tonen | Geen onderscheid | |
| Je beslist | Claude bepaalt logica | |

**User's choice:** Onderscheid maken — gebruik completedGoals data uit Phase 6

---

## Claude's Discretion

- Exacte opmaak en styling van tabel-flow
- Nummering-implementatie
- Visuele "gedeeld" markering
- Placeholder-tekst bij lege roadmap
- Gap-waarschuwing modal design
- Cleanup na verwijdering /api/export

## Deferred Ideas

None — discussion stayed within phase scope
