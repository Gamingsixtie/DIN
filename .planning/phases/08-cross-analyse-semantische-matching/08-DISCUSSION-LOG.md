# Phase 8: Cross-Analyse Semantische Matching - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 08-cross-analyse-semantische-matching
**Areas discussed:** Matching strategie, Consolidatie-output, Scope van matching, UI-integratie

---

## Matching strategie

| Option | Description | Selected |
|--------|-------------|----------|
| Tokenizer uitbreiden | findSharedCapabilities upgraden naar tokenizer-based matching. Lokaal, snel, offline. | |
| AI-gestuurde matching | Claude laten bepalen welke items semantisch gelijk zijn. Nauwkeuriger, maar traag/API-afhankelijk. | ✓ |
| Hybride: tokenizer + AI | Tokenizer als filter, AI voor validatie. Beste van beide, meer complexiteit. | |

**User's choice:** AI-gestuurde matching
**Notes:** Geen aanvullende opmerkingen.

### Follow-up: Scope van vervanging

| Option | Description | Selected |
|--------|-------------|----------|
| Alles via AI | Alle drie (baten, vermogens, inspanningen) semantische matching door Claude. | ✓ |
| Alleen vermogens via AI | Bestaande tokenizer voor baten/inspanningen behouden. | |
| Eén AI-call voor alles | Eén call die alle items krijgt en per niveau clusters teruggeeft. | |

**User's choice:** Alles via AI
**Notes:** Geen aanvullende opmerkingen.

### Follow-up: Vervanging lokale functies

| Option | Description | Selected |
|--------|-------------|----------|
| Volledig vervangen | findBenefitClusters, findEffortClusters, findSharedCapabilities vervangen door AI-calls. | ✓ |
| AI primair, lokaal als fallback | AI-matching primair, bij falen terugvallen op lokale tokenizer. | |

**User's choice:** Volledig vervangen
**Notes:** Geen aanvullende opmerkingen.

---

## Consolidatie-output

| Option | Description | Selected |
|--------|-------------|----------|
| Advies + actie | AI geeft advies per cluster. Gebruiker kan met één klik samenvoegen. Undo mogelijk. | ✓ |
| Alleen advies tonen | Toon overlap en advies, geen actieknoppen. Handmatig aanpassen in DIN-mapping. | |
| Automatisch samenvoegen | AI herkent overlap en voegt samen met 'Accepteer alles'. Per item undo. | |

**User's choice:** Advies + actie (Aanbevolen)
**Notes:** Geen aanvullende opmerkingen.

### Follow-up: Wat gebeurt bij samenvoegen

| Option | Description | Selected |
|--------|-------------|----------|
| Vervangen door gedeeld item | Originelen verwijderd, één nieuw item. Simpelst, onomkeerbaar. | |
| Markeren als geconsolideerd | Originelen blijven, krijgen 'geconsolideerd' vlag + link. Meer integriteit, complexer. | ✓ |
| Je beslist | Claude kiest op basis van data-architectuur. | |

**User's choice:** Markeren als geconsolideerd
**Notes:** Geen aanvullende opmerkingen.

---

## Scope van matching

| Option | Description | Selected |
|--------|-------------|----------|
| Over alle doelen heen | AI krijgt ALLE items van alle doelen en sectoren. Vindt cross-doel overlap. | ✓ |
| Per doel, dan aggregeren | Per doel matchen, dan aggregeren tot totaaloverzicht. | |
| Twee niveaus | Eerst per doel, dan over doelen heen. Meest compleet, twee AI-calls. | |

**User's choice:** Over alle doelen heen (Aanbevolen)
**Notes:** Geen aanvullende opmerkingen.

### Follow-up: Focus van matching (methodische inzicht)

**User's free-text response:** Baten zijn per definitie per sector anders — hogere klanttevredenheid PO vs hogere klantwaarde VO. Vermogens en inspanningen kunnen wél overlap hebben. Baten hoeven niet samengevoegd te worden (het zijn indirecte effecten), maar vermogens en inspanningen die aan verschillende sector-baten bijdragen zijn de echte consolidatiekandidaten. De keten moet zichtbaar blijven.

**Confirmed:** Baten NIET matchen, alleen vermogens en inspanningen. Baten wél tonen als context bij geconsolideerde V/I om hefboomwerking zichtbaar te maken.

---

## UI-integratie

### Lopende projecten (user-initiated topic)

**User's free-text response:** Lopende projecten (zoals outside-in trajecten die alle sectoren doorlopen) moeten ook meegenomen worden in de cross-analyse. Ze kunnen bijdragen aan vermogens over meerdere sectoren.

| Option | Description | Selected |
|--------|-------------|----------|
| Als extra laag in matching | Projecten naast inspanningen gelegd. AI matcht aan vermogens/baten. Niet samenvoegen maar linken. | ✓ |
| Als inspanning-equivalent | Projecten behandeld als type inspanning. Verschijnen in inspanningen-clusters. | |
| Je beslist | Claude kiest op basis van datamodel. | |

**User's choice:** Als extra laag, met optie dat project NIET thuishoort als er geen match is.
**Notes:** AI moet advies geven bij welke baat en vermogen een project thuishoort, inclusief "hoort niet thuis".

### Cross-analyse UI-integratie

| Option | Description | Selected |
|--------|-------------|----------|
| Bestaande AI-call upgraden | CROSS_ANALYSE_PROMPT uitbreiden. Alles in één flow, geen extra stap. | ✓ |
| Nieuwe sectie toevoegen | Bestaande analyse behouden, nieuwe secties toevoegen op dezelfde pagina. | |
| Je beslist | Claude kiest op basis van bestaand component. | |

**User's choice:** Bestaande AI-call upgraden
**Notes:** Geen aanvullende opmerkingen.

---

## Claude's Discretion

- Exacte prompt-formulering voor semantische matching
- UI-ontwerp van samenvoeg-knoppen en geconsolideerd-markering
- Schema-structuur van uitgebreide cross-analyse response
- Technische opslag van 'geconsolideerd' vlag
- Visuele weergave van project-matching
- Undo-mechanisme voor consolidatie

## Deferred Ideas

None — discussion stayed within phase scope
