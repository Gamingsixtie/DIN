# Phase 14: Lopende projecten promoveren tot volwaardige inspanningen in DIN-keten met splitsing en bevindingen-afleiding - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Bestaande `ExternalProject` entries (ingevoerd in Phase 12) kunnen per project **gepromoveerd** worden tot één of meer volwaardige `DINEffort` entries. In één AI-aanroep doet de AI een **volledige DIN-positionering** van het project: welke baat(en) het project raakt, welke vermogen(s) het bedient, en een **splitsing** van het project in 1-4 inspanningen met alle velden ingevuld. De user reviewt het voorstel en bevestigt. Tegelijk leidt de AI **bevindingen** af uit de projectbeschrijving — DIN-element suggesties (nieuwe baten/vermogens/inspanningen die het project impliceert maar niet expliciet uitvoert) die als klikbare "voeg toe"-acties in het review-scherm verschijnen om de DIN-keten te verrijken.

Raakt: `ExternalProjectSchema`, `DINEffortSchema` (+ `originProjectId`), `ExterneProjectenPanel.tsx`, `AIKoppelingPanel.tsx` of nieuwe `ProjectPromotiePanel.tsx`, `DINMappingStep.tsx`, `/api/*` (nieuwe of uitgebreide promotie-route), `ai-client.ts`, `prompts.ts`, mapping-migratie `projectCapabilityMaps → capabilityEffortMaps`.

**Buiten scope voor deze phase:** wijzigingen aan Phase 12 import/koppeling-flow, cross-analyse wizard (Phase 11/13), Word-export uitbreiding voor bevindingen als apart hoofdstuk, bulk-promotie over meerdere projecten tegelijk, multi-doel toggle of cross-sector promotie.

</domain>

<decisions>
## Implementation Decisions

### Promotie-mechanisme
- **D-01:** Promotie-trigger is een knop **per project** op de project-card in `ExterneProjectenPanel` (of in de promotie-tak van `AIKoppelingPanel` — planner/researcher kiest de schoonste plek). Eén klik → AI-aanroep → review-scherm voor dat ene project. Geen bulk-acties in deze phase.
- **D-02:** AI doet in **één aanroep** de volledige DIN-positionering voor het project en retourneert: (a) voorgestelde baat-koppeling(en) met AI-advies per match, (b) voorgestelde vermogen-koppeling(en), (c) gesplitste efforts (1-4), (d) bevindingen. User reviewt het hele pakket in één panel. Consistent met Phase 12 D-06 (AI-suggestie + handmatig bevestigen).
- **D-03:** Geen pre-condities. Promotie is beschikbaar ongeacht of het project eerder aan vermogens is gekoppeld via Phase 12 flow. De AI maakt zelf een volledig nieuwe positionering op basis van projectbeschrijving, sector, domeinen, en beschikbare DIN-context.
- **D-04:** De user kiest per voorgestelde baat-koppeling (AI-advies) welke baat het project hoort bij — meerdere baten tegelijk mogelijk. Dit is een expliciete review-stap in het promotie-panel: user ziet AI-suggestie met toelichting en vinkt aan/af.

### Splitsings-strategie
- **D-05:** AI splitst vrij binnen **1-4 inspanningen** per project op basis van projectinhoud. Geen vaste regel (per domein / per vermogen / per baat) — de AI oordeelt welke logische splitsing past bij het specifieke project. Zod-schema enforceert `.min(1).max(4)` op de splitsing.
- **D-06:** Splitsing is **optioneel**. In het review-scherm kan de user het aantal voorgestelde efforts reduceren (bv. naar 1 effort) of accepteren. Voor kleine/eenvoudige projecten blijft één effort een valide optie.
- **D-07:** AI vult **alle velden** in op de voorgestelde efforts: `title`, `description`, `domain`, `status` (default `in_uitvoering` want het is een lopend project), `quarter`, `responsibleSector` (overgenomen van origineel project), en een basis `dossier`. User kan inline corrigeren in het review-scherm, maar hoeft niet — alles heeft een default zodat bevestigen direct mogelijk is.

### Relatie origineel project ↔ nieuwe efforts
- **D-08:** Origineel `ExternalProject` wordt **gemarkeerd als gepromoveerd**, niet verwijderd. Nieuwe velden op `ExternalProjectSchema`: `promotedAt?: string` (ISO) en `promotedToEffortIds?: string[]`. Het project verdwijnt uit de standaard "Lopende projecten" lijst (gefilterd op `!promotedAt`) maar blijft oproepbaar via een "Toon gepromoveerde projecten" schakelaar voor audit/undo.
- **D-09:** Datarelatie effort → project: nieuwe optionele veld `originProjectId?: string` op `DINEffortSchema`. Lookup vanuit effort is simpel (filter op sessie), lookup vanuit project gaat via `promotedToEffortIds[]`. Bewust bi-directioneel voor snelle navigatie in beide richtingen (accepteer sync-verantwoordelijkheid bij undo/delete).
- **D-10:** Bestaande `projectCapabilityMaps` voor het gepromoveerde project worden **omgezet naar `capabilityEffortMaps`**: voor elke nieuwe effort wordt een capability-effort-koppeling aangemaakt op basis van welk vermogen de AI in de promotie-flow heeft voorgesteld. De oude `projectCapabilityMaps` voor dit project worden na conversie verwijderd. De DIN-keten blijft zo schoon (één mapping-patroon: baat → vermogen → inspanning).
- **D-11:** Terugdraaien is mogelijk via het **project-detail van een gepromoveerd project** (zichtbaar in "Toon gepromoveerde projecten"). Een "Terugdraaien"-knop verwijdert de efforts, draait `capabilityEffortMaps` terug naar `projectCapabilityMaps` waar mogelijk, clear `promotedAt`/`promotedToEffortIds`, en zet het project terug in de actieve lijst. Altijd beschikbaar zolang de sessie bestaat. Geen tijdgebonden toast-undo.

### Bevindingen-ontwerp
- **D-12:** Bevindingen zijn **DIN-element suggesties** — elementen die de AI uit de projectbeschrijving herkent als impliciet maar niet expliciet uitgevoerd. Concreet: "dit project suggereert nieuw vermogen X dat nog niet in de DIN-keten staat", "raakt ook impliciet baat Y", "ontbrekende inspanning Z voor domein Cultuur". Geen risico's, geen lessons learned tekst — uitsluitend klikbare DIN-verrijkingsvoorstellen.
- **D-13:** Bevindingen **landen in het promotie-review-scherm** als sectie onder de voorgestelde efforts. Elke bevinding heeft: type (baat / vermogen / inspanning), voorstel-tekst, AI-toelichting (waarom), en een "Voeg toe aan DIN"-knop. Klikken → nieuw DIN-element wordt direct aangemaakt in de sessie met `originProjectId` terugverwijzing naar het bron-project. Niet geaccepteerde bevindingen worden bij annuleer verwijderd.
- **D-14:** Zod-schema voor bevindingen: `FindingSuggestionSchema` met `type: 'baat' | 'vermogen' | 'inspanning'`, `beschrijving: string`, `toelichting: string`, `targetSector: SectorName`. Opgenomen in de promotie-response schema (`ProjectPromotieResultSchema`) naast de voorgestelde efforts. Geaccepteerde bevindingen worden omgezet naar echte `DINBenefit`/`DINCapability`/`DINEffort` entries bij klik; afgewezen of niet-bevestigde bevindingen worden niet persistent opgeslagen (transient in review-UI).

### Claude's Discretion
- Precieze locatie van de promotie-knop: op de bestaande project-card in `ExterneProjectenPanel`, uitgebreid `AIKoppelingPanel`, of nieuwe `ProjectPromotiePanel` — planner/researcher kiest de schoonste aansluiting op de bestaande Phase 12 UI.
- Visuele opmaak van het review-scherm: modal, uitklappaneel, full-page overlay — mits de hele DIN-keten (baat → vermogen → efforts → bevindingen) in één overzicht zichtbaar is.
- Prompt-ontwerp voor de gecombineerde promotie-AI-aanroep (baat-match + vermogen-match + splitsing + bevindingen in één response).
- Exacte Zod-schema shape voor `ProjectPromotieResultSchema` — welke velden per voorgestelde effort, hoe bevindingen gestructureerd zijn, hoe AI-toelichting meegestuurd wordt.
- Of de promotie-AI-call hergebruik maakt van bestaande prompt-assembly (`assembleSystemPrompt` + KiB-context + programmaboek) of een eigen prompt-pipeline krijgt.
- Schema-migratie voor bestaande sessies (nieuwe optionele velden moeten backward-compat zijn; `.optional()` zonder `.default()` volgt Phase 01 conventie).
- Exacte copy van de promotie-knop en review-scherm teksten.
- UI-stijl van de "gepromoveerd"-badge bij project-cards en de "Toon gepromoveerde projecten" schakelaar.
- Tests: welke unit tests op mapping-conversie, welke integration tests op de AI-flow.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Te wijzigen schemas
- `src/lib/schemas.ts` §114-153 — `DINBenefitSchema`, `DINCapabilitySchema`, `DINEffortSchema` (effort krijgt `originProjectId`)
- `src/lib/schemas.ts` §155-166 — `ExternalProjectSchema` (krijgt `promotedAt`, `promotedToEffortIds`)
- `src/lib/schemas.ts` §172-200 — Mapping schemas (`CapabilityEffortMapSchema` als doel van migratie vanuit `ProjectCapabilityMapSchema`)
- `src/lib/types.ts` §666, §779, §786 — Type afleiding voor `ExternalProject`, `DINEffort`, `ProjectCapabilityMap`

### Te wijzigen UI
- `src/components/din/ExterneProjectenPanel.tsx` — Basis Phase 12 panel; hier komt de promotie-knop per project of de aanroep van een nieuw promotie-review-scherm
- `src/components/din/AIKoppelingPanel.tsx` — Phase 12 AI-suggestie + bevestig flow; model voor de nieuwe promotie review-flow (of uit te breiden)
- `src/components/steps/DINMappingStep.tsx` §1770-1870 — Inline weergave van lopende projecten bij inspanningen-lijst, `ExterneProjectenPanel` embedding, `onAddProjects`/`onUpdate`/`onDelete`/`onConfirmMappings` handlers; hier landt de promotie-integratie

### AI-pipeline (te wijzigen/toevoegen)
- `src/lib/ai-client.ts` — `callClaudeWithValidation()` patroon voor Zod-gevalideerde AI-aanroepen; nieuwe `promoteExternalProject()` functie
- `src/lib/prompts.ts` — Prompt-assembly pattern; nieuwe `PROJECT_PROMOTIE_PROMPT` aangeankerd in DIN-methodiek (baat → vermogen → inspanning logica)
- `src/app/api/din-suggest/route.ts` of nieuwe `src/app/api/project-promotie/route.ts` — API-route voor de promotie-aanroep (planner/researcher beslist of bestaande route uitgebreid wordt of nieuwe route)

### Session-context
- `src/lib/session-context.tsx` — `updateSession` functionele updater pattern (Phase 2 D-03); alle datamutaties tijdens promotie gebruiken dit
- `src/lib/persistence.ts` — Dual persistence (localStorage-first + Supabase async); Phase 12 datamodel-uitbreidingen volgen ditzelfde

### DIN-service helpers
- `src/lib/din-service.ts` — `generateId()`, bestaande CRUD helpers; nieuwe `promoteProjectToEfforts()` functie past in dit bestand

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek: hoofdstuk over de keten baat → vermogen → inspanning als anker voor de promotie-AI-prompt. Inspanningsdomeinen (Mens / Processen / Data & Systemen / Cultuur) blijven de categorisatie.

### Prior context
- `.planning/phases/12-lopende-projecten-invullen-in-din-netwerk/12-CONTEXT.md` — D-03 (multi-domein projects), D-04 (per sector), D-06 (AI-suggestie + manual confirm), D-09 (project → vermogen koppeling), D-12/D-14 (inline weergave + Word-export)
- `.planning/phases/11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie/11-CONTEXT.md` — D-11 handmatige "Analyseer" knop pattern, D-12 cumulatieve AI-context

### Relevante Zod/validatie patterns
- `src/lib/__tests__/external-project-schema.test.ts` — Bestaande tests op `ExternalProjectSchema`; uitbreiden met tests voor nieuwe velden

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ExterneProjectenPanel` (Phase 12)** — Bestaand panel voor import/review/management van lopende projecten per sector. Promotie-knop sluit hierop aan: werkt op dezelfde project-lijst, zelfde sector-filter, zelfde `updateSession` patterns.
- **`AIKoppelingPanel` (Phase 12)** — AI-suggestie + handmatig bevestigen review-UI voor project → vermogen koppelingen. Bouwsteen voor de bredere promotie-review (die ook baten en effort-splitsing omvat).
- **`callClaudeWithValidation()` (`src/lib/ai-client.ts`)** — Centraal AI-aanroeppatroon met Zod-validatie en 2 silent retries. Gebruiken voor de promotie-call met een nieuw `ProjectPromotieResultSchema`.
- **`assembleSystemPrompt()`** — Layered prompt context (programmaboek + KiB + sectorwerk + completed goals). Promotie-prompt hergebruikt deze assembly zodat alle context consistent meegaat.
- **Zod-first validatie pipeline (Phase 01)** — Elke AI-response wordt gevalideerd; schemas in `schemas.ts` zijn single source of truth. Promotie-response volgt dit patroon.
- **Mapping helpers** — Bestaande `capabilityEffortMap` voor de standaard baat→vermogen→inspanning keten. Geen nieuw mapping-patroon nodig; migratie-conversie gebruikt bestaande structuren.
- **`generateId()` in `din-service.ts`** — UUID generator voor nieuwe entity-IDs bij promotie-splitsing.

### Established Patterns
- **Dual persistence (localStorage-first, Supabase async)** — Alle nieuwe data volgt dit (Phase 2). Nieuwe velden op schemas moeten backward-compatible zijn.
- **Functionele `updateSession(prev => ...)`** — Verplicht voor alle session-mutaties (Phase 2 D-03). Promotie-actie doet meerdere updates atomair in één updater.
- **AI-suggestie + handmatig bevestigen (Phase 12 D-06, Phase 11 D-11)** — Handmatige "Analyseer/Promoveer" knop, AI stelt voor, user reviewt en bevestigt. Geen auto-triggers.
- **Inline badges op DIN-items** — Phase 12 D-12 gebruikt "Lopend project" badge in inspanningen-lijst. Gepromoveerde projecten krijgen een andere badge ("gepromoveerd") en verdwijnen uit de actieve lijst, tenzij togglet.
- **Schema-uitbreidingen met `.optional()` zonder `.default()`** — Phase 01 conventie voor backward-compat met directe object-constructie.

### Integration Points
- **`ExterneProjectenPanel`** — Aanroepsite voor promotie-knop (of modal-opener)
- **`DINMappingStep.tsx` §1780-1870** — Inline weergave van lopende projecten verdwijnt voor gepromoveerde projecten; de nieuwe efforts komen automatisch in de bestaande `efforts` rendering via de standaard keten
- **`session.externalProjects`, `session.projectCapabilityMaps`, `session.capabilityEffortMaps`, `session.efforts`** — Alle vier worden gemuteerd tijdens promotie; één `updateSession(prev => {...})` call moet atomair alle mutaties combineren
- **Word-export (`src/lib/word-export.ts` §1022-1034)** — Bestaande `externalProjectsSection()` filtert al op niet-gepromoveerde projecten zodra `promotedAt` bestaat; gepromoveerde efforts verschijnen automatisch in de standaard DIN-keten rendering. **Geen wijzigingen aan Word-export zijn in scope** van Phase 14 (buiten het filter op gepromoveerde projecten).
- **Cross-analyse (Phase 8/11)** — Consumeert `session.efforts` en `session.capabilities`; gepromoveerde efforts zijn vanaf dat moment onderdeel van cross-analyse zonder extra wijzigingen nodig.

</code_context>

<specifics>
## Specific Ideas

- **Eén-knop flow:** De user moet op één knop kunnen klikken en daarna een complete DIN-positionering zien — baat → vermogen → gesplitste efforts → bevindingen — in één review-scherm. Minimale friction, maximaal AI-werk per klik.
- **Gepromoveerd ≠ verwijderd:** Het originele project blijft bestaan als audit-trail. "Toon gepromoveerde projecten" is de ontsnapping voor review en undo. De user moet nooit het gevoel hebben dat data verloren is.
- **Bevindingen verrijken de keten:** Een project wordt niet alleen ingepast, het levert ook iets op: "dit project laat zien dat je vermogen X mist". Klikbare "voeg toe"-acties maken dat direct actionable.
- **Backward-compat:** Alle nieuwe velden zijn `.optional()`. Bestaande sessies zonder `promotedAt`/`originProjectId`/`promotedToEffortIds` blijven werken zonder migratie.
- **Methodische puurheid:** Na promotie is de DIN-keten volgens methodiek: baat → vermogen → inspanning (via `capabilityEffortMap`). Lopende projecten als aparte zijkanaal (via `projectCapabilityMap`) verdwijnen voor gepromoveerde items.

</specifics>

<deferred>
## Deferred Ideas

- **Bulk-promotie per sector** — "Promoveer alle projecten van PO in één keer" is handig voor sessies met veel projecten, maar vereist een aparte bulk-review-UX en is buiten scope van deze phase.
- **Bevindingen als Word-export hoofdstuk** — "Bevindingen uit lopende projecten" als apart hoofdstuk in de export zou stakeholders een overzicht geven, maar vereist persistente bevindingen-opslag en Word-template werk. Kan een latere phase worden.
- **Bevindingen-historie (afgewezen/geaccepteerd trail)** — Nu worden niet-geaccepteerde bevindingen niet opgeslagen. Een trail van "welke bevindingen heeft de AI ooit voorgesteld, wat deed de user ermee" is nuttig voor audit maar introduceert state-beheer complexiteit.
- **Tijdgebonden toast-undo** — Een quick-undo toast naast het project-detail terugdraaien is denkbaar maar niet noodzakelijk; project-detail undo volstaat voor deze phase.
- **AI-prompt iteratie op bestaande gepromoveerde projecten** — "Analyseer dit gepromoveerde project opnieuw" is een re-promotie scenario dat buiten scope valt; user kan handmatig undo + opnieuw promoveren.
- **Cross-sector promotie** — Een project dat meerdere sectoren bedient en gepromoveerd wordt tot cross-sector efforts. Valt buiten Phase 12 D-04 (projecten per sector) en daarmee ook buiten deze phase.

</deferred>

---

*Phase: 14-lopende-projecten-promoveren-tot-volwaardige-inspanningen-in-din-keten-met-splitsing-en-bevindingen-afleiding*
*Context gathered: 2026-04-05*
