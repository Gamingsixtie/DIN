# Phase 8: Cross-Analyse Semantische Matching - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-analyse herkent echte samenhang tussen sectoren en geeft bruikbare consolidatie-adviezen. Gedeelde vermogens en inspanningen over PO/VO/Zakelijk worden herkend op basis van semantische gelijkenis (AI-gestuurd) en kunnen geconsolideerd worden. Lopende projecten worden als extra laag meegenomen.

</domain>

<decisions>
## Implementation Decisions

### Matching strategie
- **D-01:** Volledig AI-gestuurde semantische matching via Claude API. Lokale tokenizer-functies (`findBenefitClusters`, `findEffortClusters`, `findSharedCapabilities`) worden vervangen door AI-calls voor de cross-analyse.
- **D-02:** De nl-tokenizer.ts (Snowball stemmer) blijft bestaan voor eventueel ander gebruik, maar wordt niet meer gebruikt voor cross-analyse matching.

### Matching scope & focus
- **D-03:** Baten worden NIET gematcht of samengevoegd. Baten zijn per sector verschillend (hogere klanttevredenheid PO vs hogere klantwaarde VO) — dat is methodisch correct. Baten worden wél getoond als context bij geconsolideerde vermogens/inspanningen om de hefboomwerking zichtbaar te maken.
- **D-04:** Vermogens en inspanningen worden semantisch gematcht over sectoren heen. Dit zijn de consolidatiekandidaten: één gedeeld vermogen of inspanning dat meerdere sector-specifieke baten bedient.
- **D-05:** Matching gebeurt over alle doelen heen in één AI-call. Niet per doel apart — de cross-analyse moet volledige samenhang over het hele programma zichtbaar maken.
- **D-06:** Eén AI-call die alle DIN-items ontvangt en per niveau (vermogens, inspanningen) clusters teruggeeft, inclusief de koppeling naar sector-baten.

### Lopende projecten
- **D-07:** Lopende/externe projecten worden als extra laag meegenomen in de cross-analyse. AI matcht projecten aan vermogens en baten — adviseert bij welk vermogen/baat een project thuishoort.
- **D-08:** AI geeft ook expliciet aan als een lopend project NIET thuishoort in de DIN-keten (geen match). Dit helpt de gebruiker bij het filteren van relevante vs irrelevante projecten.

### Consolidatie-output
- **D-09:** Advies + actie per cluster. AI geeft consolidatie-advies (combineren/afstemmen/apart houden). Gebruiker kan met één klik items samenvoegen tot een gedeeld item met meerdere sector-koppelingen.
- **D-10:** Bij samenvoegen blijven originele items bestaan maar krijgen een 'geconsolideerd' vlag + link naar het gedeelde item. In de UI worden ze samengevouwen/gefilterd. Dit behoudt data-integriteit en maakt undo mogelijk.
- **D-11:** Geconsolideerde vermogens/inspanningen tonen altijd de keten: aan welke sector-specifieke baten ze bijdragen. Dit maakt de hefboomwerking zichtbaar.

### UI-integratie
- **D-12:** Bestaande CROSS_ANALYSE_PROMPT en AICrossAnalyseSchema upgraden. Semantische matching, consolidatie-clusters, en project-mapping worden in het bestaande cross-analyse resultaat opgenomen. Geen aparte stap of tab.
- **D-13:** CrossAnalyseStep UI uitbreiden met consolidatie-acties (samenvoeg-knoppen) bij de geïdentificeerde clusters.

### Claude's Discretion
- Exacte prompt-formulering voor semantische matching instructie
- UI-ontwerp van samenvoeg-knoppen en geconsolideerd-markering
- Schema-structuur van de uitgebreide cross-analyse response
- Hoe de 'geconsolideerd' vlag technisch wordt opgeslagen (nieuw veld op DINBenefit/DINCapability/DINEffort of apart mapping object)
- Visuele weergave van de project-matching resultaten
- Hoe undo van consolidatie werkt (vlag verwijderen + UI-state)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Cross-analyse (te wijzigen)
- `src/app/api/cross-analyse/route.ts` — Bestaande cross-analyse API route met AI-call, sector-integratie, en externalProjects handling
- `src/components/steps/CrossAnalyseStep.tsx` — Bestaande UI met SynergieSection, GapsSection, HefboomSection, DomeinbalansSection
- `src/lib/prompts.ts` lijn 47-140 — CROSS_ANALYSE_PROMPT met JSON response structuur (uit te breiden met semantische matching secties)
- `src/lib/schemas.ts` — AICrossAnalyseSchema Zod validatie (uit te breiden)

### Lokale matching (te vervangen)
- `src/lib/din-service.ts` lijn 173-413 — `findSharedCapabilities()` (exacte match), `findBenefitClusters()` en `findEffortClusters()` (tokenizer-based) — worden vervangen door AI-matching
- `src/lib/nl-tokenizer.ts` — Snowball stemmer + compound splitting (blijft bestaan, niet meer gebruikt voor cross-analyse)

### DIN data-model (te wijzigen)
- `src/lib/schemas.ts` — DINBenefitSchema, DINCapabilitySchema, DINEffortSchema — uitbreiden met 'geconsolideerd' vlag
- `src/lib/types.ts` — Type definities voor DIN-entiteiten

### Prompt-assembly
- `src/lib/prompt-assembly.ts` — assembleSystemPrompt() — cross-analyse call moet door prompt-assembly gaan voor consistent context-patroon
- `src/lib/ai-client.ts` — callClaudeWithValidation() centraal AI-aanroeppatroon

### Session state
- `src/lib/session-context.tsx` — SessionProvider met updateSession voor consolidatie-acties

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek: baten zijn sector-specifiek, vermogens en inspanningen kunnen gedeeld zijn

### Requirements
- `.planning/REQUIREMENTS.md` — CROSS-01 (gedeelde baten herkennen), CROSS-02 (gedeelde vermogens), CROSS-03 (gedeelde inspanningen consolideren)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CrossAnalyseStep.tsx` (800+ regels): Volledige UI met secties voor synergieën, gaps, hefboomwerking, domeinbalans. LoadingOverlay met DIN-keten animatie. Kan uitgebreid worden met consolidatie-secties.
- `callClaudeWithValidation()` in ai-client.ts: Centraal AI-aanroeppatroon met Zod validatie en retry. Wordt gebruikt voor de uitgebreide cross-analyse call.
- `assembleSystemPrompt()` in prompt-assembly.ts: Layered prompt opbouw (programmaboek → KiB → sectorwerk → eerder-uitgewerkte-doelen). Cross-analyse call moet hier doorheen.
- `AICrossAnalyseSchema` in schemas.ts: Bestaande Zod schema voor cross-analyse response. Uit te breiden met semantische matching velden.
- `externalProjects` parameter in cross-analyse route: Al aanwezig voor sector-integratie, herbruikbaar voor project-matching.
- Toast-systeem uit Phase 2: Voor feedback bij consolidatie-acties ("Items samengevoegd").

### Established Patterns
- AI-responses via callClaudeWithValidation met Zod schema's en retry
- Functionele updateSession(prev => ...) voor state-mutaties
- Prompt-assembly met layered context blokken
- JSON-only response format in AI prompts (geen markdown)

### Integration Points
- `CROSS_ANALYSE_PROMPT` in prompts.ts: Uitbreiden met semantische matching instructies en project-matching
- `AICrossAnalyseSchema` in schemas.ts: Uitbreiden met vermogen-clusters, inspanning-clusters, project-mapping
- `CrossAnalyseStep.tsx`: Nieuwe secties voor consolidatie-resultaten met actieknoppen
- DIN-entiteit schemas: Nieuw veld voor 'geconsolideerd' markering
- Session state: Consolidatie-acties via updateSession

</code_context>

<specifics>
## Specific Ideas

- Baten zijn per definitie sector-specifiek in de DIN-methodiek — "hogere klanttevredenheid PO" is niet hetzelfde als "hogere klantwaarde VO". Matching richt zich op vermogens en inspanningen.
- De hefboomwerking wordt zichtbaar door geconsolideerde V/I te tonen met de sector-baten waaraan ze bijdragen: één training die drie verschillende baten bedient in drie sectoren.
- Lopende projecten (bijv. "outside-in traject" dat alle sectoren hebben gevolgd) moeten expliciet gekoppeld worden aan vermogens. AI adviseert ook als een project NIET thuishoort.
- Consolidatie behoudt originele items (geconsolideerd-vlag) — geen destructieve samenvoeg-operatie.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-cross-analyse-semantische-matching*
*Context gathered: 2026-04-03*
