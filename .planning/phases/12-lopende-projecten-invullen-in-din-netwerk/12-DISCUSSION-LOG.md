# Phase 12: Lopende Projecten Invullen in DIN-Netwerk - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 12-lopende-projecten-invullen-in-din-netwerk
**Areas discussed:** Invoermethode & structuur, DIN-koppeling workflow, Projecttypen & categorisatie, Visuele weergave & overzicht

---

## Invoermethode & structuur

### Q1: Hoe moeten lopende projecten worden ingevoerd?

| Option | Description | Selected |
|--------|-------------|----------|
| Uitgebreid formulier | Structuurvelden toevoegen: eigenaar, budget, kwartaal, domein | |
| Huidig schema + domein | Huidige velden + domein toevoegen | |
| Bulk import uit bestand | CSV/Excel upload voor grote aantallen | |

**User's choice:** Free text — klantreizen staan in Miro, handmatig knippen/plakken is acceptabel, vraag is hoe dat het handigst werkt.
**Notes:** Gebruiker heeft klantreizen in Miro boards. Export als PDF of copy-paste van tekst is de verwachte invoermethode.

### Q2: Hoe wil je de Miro-klantreis informatie gebruiken?

| Option | Description | Selected |
|--------|-------------|----------|
| Handmatig overnemen | Kopieer uit Miro, vul in via formulier | |
| Tekst-import (copy-paste) | Plak lijst, AI parseert naar projecten | |
| Miro API integratie | Echte koppeling met Miro API | |

**User's choice:** Free text — handmatig is niet erg, maar wil weten hoe best knippen/plakken. Miro kan ook als PDF worden opgeslagen.

### Q3: Welke invoermethode werkt het best?

| Option | Description | Selected |
|--------|-------------|----------|
| Tekstveld + AI parsing | Groot tekstveld, AI extraheert projecten | |
| PDF/document upload | Miro exporteren als PDF, uploaden | |
| Beide opties | Zowel tekst plakken als document uploaden | ✓ |

**User's choice:** Beide opties
**Notes:** Maximale flexibiliteit — gebruiker kiest wat op dat moment handig is.

### Q4: Welke velden moeten projecten hebben?

| Option | Description | Selected |
|--------|-------------|----------|
| Naam + beschrijving + domein | Huidige velden + domein toevoegen | ✓ |
| Uitgebreid profiel | Naam, beschrijving, status, domein, eigenaar, omvang, kwartaal | |
| Je decide | Claude bepaalt optimale veldset | |

**User's choice:** Naam + beschrijving + domein

### Q5: Moeten projecten sector-gebonden of cross-sectoraal zijn?

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-sectoraal | Onafhankelijk, gekoppeld aan meerdere sectoren | |
| Per sector zoals nu | Elk project bij één sector | ✓ |

**User's choice:** Per sector zoals nu

---

## DIN-koppeling workflow

### Q1: Hoe moeten projecten gekoppeld worden aan het DIN-netwerk?

| Option | Description | Selected |
|--------|-------------|----------|
| AI-suggestie + handmatig bevestigen | AI stelt koppelingen voor, gebruiker bevestigt | ✓ |
| Volledig handmatig | Gebruiker kiest uit lijst vermogens/inspanningen | |
| Volledig automatisch | AI koppelt zonder tussenkomst | |

**User's choice:** AI-suggestie + handmatig bevestigen

### Q2: Waar in de wizard-flow hoort koppelen thuis?

| Option | Description | Selected |
|--------|-------------|----------|
| In de DINMappingStep | Uitbreiding ExterneProjectenPanel | ✓ |
| Aparte stap na cross-analyse | Nieuwe wizard-stap | |
| Bij de cross-analyse | Onderdeel van cross-analyse stap | |

**User's choice:** In de DINMappingStep

### Q3: Wat voor type DIN-koppelingen?

| Option | Description | Selected |
|--------|-------------|----------|
| Project → Vermogens + Inspanningen | Koppeling op vermogen/inspanning-niveau | |
| Project → Alle niveaus | Koppeling aan baten, vermogens én inspanningen | |
| Project = Inspanning | Project omzetten naar DINEffort | |

**User's choice:** Free text — een project IS een inspanning, maar kan meerdere domeinen raken (bijv. mens + systeem & data + processen).

### Q4: Hoe omgaan met multi-domein projecten?

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-domein veld | Array van domeinen, multi-select checkboxes | ✓ |
| Opsplitsen in deel-inspanningen | Per domein een aparte DINEffort | |
| Primair domein + tags | Één hoofddomein plus secundaire tags | |

**User's choice:** Multi-domein veld

---

## Projecttypen & categorisatie

### Q1: Zijn 'outside-in', 'online', 'systemen & data' vaste categorieën?

| Option | Description | Selected |
|--------|-------------|----------|
| Voorbeelden van projecten | Concrete lopende projecten, geen vaste categorieën | ✓ |
| Vaste categorieën | Drie pijlers waaronder alle projecten vallen | |
| Pre-filled + vrij toevoegen | Suggesties klaar, vrij toevoegen mogelijk | |

**User's choice:** Voorbeelden van projecten

### Q2: Moeten projecten een statusveld behouden?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, huidige statussen | Gepland, in_uitvoering, afgerond, on_hold | ✓ |
| Uitgebreidere statussen | Extra statussen toevoegen | |
| Geen status nodig | Alleen positionering in DIN-netwerk | |

**User's choice:** Ja, huidige statussen

---

## Visuele weergave & overzicht

### Q1: Hoe moeten gekoppelde projecten zichtbaar zijn?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline bij inspanningen | Speciaal gemarkeerde items in inspanningen-lijst | ✓ |
| Apart paneel | Eigen paneel/tab naast DIN-keten | |
| In de tabel-flow (export) | Alleen in export zichtbaar | |

**User's choice:** Inline bij inspanningen

### Q2: Hoe wordt 'niet-passend' zichtbaar?

| Option | Description | Selected |
|--------|-------------|----------|
| Waarschuwingsbadge | AI markeert met oranje/rode badge + toelichting | ✓ |
| Aparte 'niet-gekoppeld' sectie | Projecten zonder koppeling in eigen sectie | |
| Je decide | Claude bepaalt | |

**User's choice:** Waarschuwingsbadge

### Q3: Moeten projecten in de Word-export?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, in de DIN-keten tabel | Bij inspanningen-kolom, gemarkeerd als 'lopend project' | ✓ |
| Alleen in externe projecten sectie | Bestaande sectie, geen DIN-integratie | |
| Je decide | Claude bepaalt | |

**User's choice:** Ja, in de DIN-keten tabel

---

## Claude's Discretion

- UI-ontwerp van tekst-import veld en document upload component
- Prompt-ontwerp voor AI-extractie en AI-koppeling suggesties
- Visuele stijl van badges en multi-domein checkboxes
- Schema-migratie strategie
- Export opmaak voor projecten in tabel-flow

## Deferred Ideas

None — discussion stayed within phase scope
