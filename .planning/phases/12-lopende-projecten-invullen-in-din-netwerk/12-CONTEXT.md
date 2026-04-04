# Phase 12: Lopende Projecten Invullen in DIN-Netwerk - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Bestaande lopende projecten (zoals outside-in, online, systemen & data) kunnen worden ingevoerd, gestructureerd, en gepositioneerd in het DIN-netwerk. Projecten worden behandeld als inspanningen die meerdere domeinen kunnen raken, en worden via AI-suggesties gekoppeld aan vermogens in de DIN-keten. Het ExterneProjectenPanel in DINMappingStep wordt uitgebreid met invoer (tekst plakken + document upload), AI-parsing, multi-domein ondersteuning, en DIN-koppeling met visuele feedback.

</domain>

<decisions>
## Implementation Decisions

### Invoermethode & structuur
- **D-01:** Twee invoermethoden aanbieden: (1) groot tekstveld waar gebruiker klantreis-informatie uit Miro of andere bronnen kan plakken, en (2) document upload (PDF/DOCX). AI extraheert projectnamen, beschrijvingen, en status uit de tekst/het document.
- **D-02:** Na AI-extractie reviewt de gebruiker het resultaat en kan corrigeren/aanvullen. Vergelijkbaar met de sectorplan-import flow (SectorWerkStep).
- **D-03:** Projectvelden na extractie: naam, beschrijving, status, en domein(en). Het huidige schema (`ExternalProjectSchema`) wordt uitgebreid met een `domains` array (meerdere inspanningsdomeinen: Mens, Processen, Data & Systemen, Cultuur) in plaats van één enkel domein.
- **D-04:** Projecten blijven per sector (`sectorId`) — niet cross-sectoraal. Elk project hoort bij één sector.
- **D-05:** Bestaande statusopties behouden: gepland, in_uitvoering, afgerond, on_hold.

### DIN-koppeling workflow
- **D-06:** AI-suggestie + handmatig bevestigen. Na invoer analyseert de AI het project en stelt voor aan welke vermogens het bijdraagt. Gebruiker bevestigt, wijzigt, of verwerpt de koppelingen.
- **D-07:** Koppeling vindt plaats in de DINMappingStep — uitbreiding van het huidige ExterneProjectenPanel. Geen aparte wizard-stap.
- **D-08:** Een lopend project IS in essentie een inspanning, maar dan een die meerdere domeinen kan raken. Na koppeling aan vermogens wordt het project als inspanning-achtig element in de DIN-keten opgenomen.
- **D-09:** Projecten worden gekoppeld aan vermogens (niet aan baten — baten zijn te hoog-niveau). De AI stelt `project → vermogen` koppelingen voor.

### Projecttypen & categorisatie
- **D-10:** Geen vaste categorieën. 'Outside-in', 'online', en 'systemen & data' zijn voorbeelden van concrete lopende projecten, geen vooraf gedefinieerde typen. Gebruikers voegen vrij projecten toe.
- **D-11:** Multi-domein veld: een project kan meerdere inspanningsdomeinen raken (bijv. ['data_systemen', 'processen']). In de UI als multi-select checkboxes.

### Visuele weergave & overzicht
- **D-12:** Gekoppelde projecten verschijnen inline bij de inspanningen-lijst, visueel onderscheidbaar van DIN-gegenereerde inspanningen (speciaal icoon of badge 'lopend project').
- **D-13:** AI markeert projecten die niet goed passen met een waarschuwingsbadge (oranje/rood) en toelichting waarom. Gebruiker kan het project herpositioneren of als 'buiten scope' markeren.
- **D-14:** In de Word-export verschijnen gekoppelde projecten in de DIN-keten tabel-flow bij de inspanningen-kolom, gemarkeerd als 'lopend project'. Geeft stakeholders direct inzicht.

### Claude's Discretion
- Exacte UI-ontwerp van het tekst-import veld en document upload component
- Prompt-ontwerp voor AI-extractie van projecten uit klantreis-tekst
- Prompt-ontwerp voor AI-suggestie van project → vermogen koppelingen
- Hoe de multi-domein checkboxes eruitzien in het formulier
- Visuele stijl van de 'lopend project' badge bij inspanningen
- Hoe de waarschuwingsbadge eruitziet en welke tekst de AI-toelichting krijgt
- Schema-migratie strategie voor het toevoegen van `domains` array aan ExternalProject
- Hoe projecten in de tabel-flow export worden opgemaakt (kleur, markering)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Externe projecten (te wijzigen)
- `src/lib/schemas.ts` lijn 155-162 — `ExternalProjectSchema` Zod schema (uitbreiden met `domains` array)
- `src/components/steps/DINMappingStep.tsx` lijn 85-230 — `ExterneProjectenPanel` component (uitbreiden met import, AI-parsing, DIN-koppeling)
- `src/lib/types.ts` lijn 666 — `ExternalProject` type (afgeleid van schema)

### AI-integratie (te wijzigen/toevoegen)
- `src/lib/ai-client.ts` lijn 250, 524 — `externalProjects` parameter in cross-analyse en sector-integratie calls
- `src/lib/prompts.ts` lijn 122-149 — Externe projecten secties in cross-analyse prompt
- `src/app/api/cross-analyse/route.ts` lijn 30, 53 — ExternalProjects handling in API route

### Sectorplan-import (als patroon)
- `src/components/steps/SectorWerkStep.tsx` — Bestaand patroon voor document upload + AI parsing + review flow
- `src/app/api/parse-sector/route.ts` — Document parsing API route (herbruikbaar patroon)
- `src/app/api/analyze-sectorplan/route.ts` — AI analyse API route (herbruikbaar patroon)

### Export (te wijzigen)
- `src/lib/word-export.ts` lijn 1022-1034 — `externalProjectsSection()` (uitbreiden met DIN-keten integratie)
- `src/components/steps/ExportStep.tsx` lijn 772-800 — `ExterneProjectenBlock` component (uitbreiden)

### DIN-keten koppelingen
- `src/lib/schemas.ts` — Bestaande mapping schemas (GoalBenefitMapSchema, BenefitCapabilityMapSchema, CapabilityEffortMapSchema) als patroon voor project-vermogen mapping
- `src/lib/din-service.ts` — DIN CRUD helpers en query functies

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek referentie, inspanningsdomeinen definitie

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExterneProjectenPanel` in DINMappingStep: Bestaand panel met add/update/delete voor externe projecten per sector. Basis voor uitbreiding.
- `SectorWerkStep` document upload + AI parsing flow: Herbruikbaar patroon voor de tekst-import en document upload functionaliteit.
- `parse-sector` API route: Document parsing (DOCX/TXT) via mammoth library — herbruikbaar voor project-import.
- Zod schema validatie pipeline: Bestaand patroon voor AI response → Zod validatie → getypeerde objecten.

### Established Patterns
- Dual persistence (localStorage-first, Supabase async): Alle nieuwe data volgt dit patroon.
- Functionele state updaters (`updateSession(prev => ...)`)): Verplicht voor alle session updates.
- AI-suggestie + handmatig bevestigen: Bestaand patroon in DINCreatieWizard en BenefitCard.
- Mapping schemas voor N:M relaties: `goalBenefitMap`, `benefitCapabilityMap`, `capabilityEffortMap` als patroon.

### Integration Points
- ExterneProjectenPanel in DINMappingStep (~lijn 1933): Hier wordt de uitbreiding gebouwd.
- Cross-analyse API route: Ontvangt al `externalProjects` — moet aangepast worden voor nieuwe velden.
- Word-export `externalProjectsSection()`: Moet projecten in DIN-keten tabel-flow opnemen.
- Session state `externalProjects` array: Bestaand veld op DINSession, schema-update nodig.

</code_context>

<specifics>
## Specific Ideas

- De klantreizen staan in Miro als visuele boards met tekst en afbeeldingen. Export als PDF of copy-paste van tekst is de verwachte invoermethode.
- Concrete projectvoorbeelden: "outside-in" (klantgericht werken), "online" (digitaal platform), "systemen & data" (IT-infrastructuur).
- Een project als "online platform" kan zowel Data & Systemen als Processen als Mens raken — daarom is multi-domein essentieel.
- De flow moet vergelijkbaar aanvoelen als de sectorplan-import: document/tekst → AI parseert → gebruiker reviewt → gestructureerde data.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-lopende-projecten-invullen-in-din-netwerk*
*Context gathered: 2026-04-04*
