# Phase 5: Sectorwerk Doorstroming - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 05-sectorwerk-doorstroming
**Areas discussed:** Suggestie-weergave, AI context-injectie, Migratie bestaande data, Weergave in SectorWerkStep

---

## Suggestie-weergave

### Hoe moeten sectorwerk-suggesties verschijnen in de DIN-mapping stap?

| Option | Description | Selected |
|--------|-------------|----------|
| Suggestiepaneel | Inklapbaar paneel bovenaan DIN-mapping met suggesties per sector. Klik op [+] om suggestie over te nemen. | ✓ |
| Pre-filled wizard | Creatie-wizard wordt voorgevuld met suggesties als startwaarden. | |
| Context-only (geen UI) | Alleen als AI-context, geen zichtbare UI-wijziging. | |

**User's choice:** Suggestiepaneel
**Notes:** Geen

### Wat moet er gebeuren als de gebruiker op een suggestie klikt?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct overnemen | Klik [+] → item direct aangemaakt. Daarna bewerken via kaart-UI. | ✓ |
| Wizard openen | Klik → DINCreatieWizard opent met vooringevulde startwaarde. | |
| Je beslist | Claude kiest op basis van bestaande patronen. | |

**User's choice:** Direct overnemen
**Notes:** Geen

### Moet het suggestiepaneel alleen baten tonen, of ook vermogens en inspanningen?

| Option | Description | Selected |
|--------|-------------|----------|
| Alleen baten | Vermogens en inspanningen worden door AI gegenereerd. | ✓ |
| Alle drie niveaus | Baten, vermogens én inspanningen apart. | |
| Baten + vermogens | Inspanningen te gedetailleerd voor suggesties. | |

**User's choice:** Alleen baten
**Notes:** Geen

### Wat moet er met een suggestie gebeuren nadat die is overgenomen?

| Option | Description | Selected |
|--------|-------------|----------|
| Visueel markeren | Doorgestreept of grijs, blijven zichtbaar als referentie. | ✓ |
| Verwijderen uit lijst | Verdwijnen uit paneel. | |
| Ongewijzigd laten | Altijd staan zoals ze zijn. | |

**User's choice:** Visueel markeren
**Notes:** Geen

---

## AI context-injectie

### Hoe moet de sectorwerk-analyse als context aan de AI worden meegegeven?

| Option | Description | Selected |
|--------|-------------|----------|
| System prompt blok | Apart blok na programmaboek + KiB context. | ✓ |
| User message context | In de user message samen met doel en vraag. | |
| Gestructureerd JSON | Als JSON-blok in de prompt. | |

**User's choice:** System prompt blok
**Notes:** Geen

### Moet de sectorwerk-context bij alle AI-aanroepen mee?

| Option | Description | Selected |
|--------|-------------|----------|
| Alleen DIN-generatie | Alleen bij din-mapping en din-suggest. | ✓ |
| Alle AI-aanroepen | Consistent overal mee. | |
| Je beslist | Claude bepaalt per endpoint. | |

**User's choice:** Alleen DIN-generatie
**Notes:** Geen

---

## Migratie bestaande data

### Hoe omgaan met bestaande sessies met sectorAnalyses als strings?

| Option | Description | Selected |
|--------|-------------|----------|
| Stille migratie bij laden | JSON.parse + Zod validatie. Markdown → verwijder + melding. | ✓ |
| Oude data negeren | Verwijderen, opnieuw analyseren. | |
| Dual support | Schema accepteert string en object. | |

**User's choice:** Stille migratie bij laden
**Notes:** Consistent met Phase 1 D-08

---

## Weergave in SectorWerkStep

### Hoe uitgebreid moet de gestructureerde weergave zijn?

| Option | Description | Selected |
|--------|-------------|----------|
| Gestructureerde kaarten | Visuele kaarten per categorie met kleuren. | ✓ |
| Compacte accordeon | Inklapbare secties, standaard alleen samenvatting. | |
| Minimale aanpassing | Lichte opmaak (headings, bullets). | |

**User's choice:** Gestructureerde kaarten
**Notes:** Geen

### Moeten inspanningen gegroepeerd worden per domein met DIN-kleuren?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, domein-kleuren | Mens=blauw, Processen=groen, Data & Systemen=paars, Cultuur=amber. | ✓ |
| Platte lijst | Eén lijst zonder kleuren. | |
| Je beslist | Claude kiest op basis van bestaande patronen. | |

**User's choice:** Ja, domein-kleuren
**Notes:** Consistent met rest van de app

---

## Claude's Discretion

- Exacte layout en styling van suggestiepaneel
- System prompt formattering van sectorwerk-context
- Migratie-implementatie details
- Kaart-layout responsive design
- Optionele "alle suggesties overnemen" batch-knop

## Deferred Ideas

None — discussion stayed within phase scope
