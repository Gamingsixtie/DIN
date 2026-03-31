# Phase 3: Programmaboek Context Pipeline - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-prompts bevatten relevante methodiek-context uit het programmaboek (`docs/programmaboek.doc`). Bij het genereren en aanscherpen van baten, vermogens en inspanningen wordt de juiste programmaboek-sectie meegegeven. Bij cross-analyse wordt de theoretische context meegegeven voor toetsing op uitvoerbaarheid. De tekst wordt token-bewust ingekort (geen willekeurige afkapping midden in een zin).

</domain>

<decisions>
## Implementation Decisions

### Extractiemoment
- **D-01:** Build-time extractie — tekst wordt eenmalig uit `docs/programmaboek.doc` gehaald met mammoth en opgeslagen als importeerbare secties in de codebase. Geen runtime parsing van het 28MB .doc bestand.
- **D-02:** Opslagformaat wordt bepaald door Claude (TypeScript constanten of JSON) — zolang het per sectie importeerbaar is.

### Sectieselectie
- **D-03:** Vaste mapping per AI use case — elke AI-aanroep (baten-generatie, vermogens-generatie, etc.) krijgt een vooraf bepaalde programmaboek-sectie. Geen runtime keyword-matching of AI-selectie.
- **D-04:** De researcher-agent leest het programmaboek, identificeert de hoofdstukstructuur, en stelt de mapping voor. De gebruiker reviewt en keurt de mapping goed voordat deze wordt geimplementeerd.

### Context-injectie
- **D-05:** Programmaboek-context wordt geplaatst in de system prompt, als achtergrondkennis voor Claude. Dit past bij de rol "je kent de methodiek".
- **D-06:** Bestaande handgeschreven methodiek-uitleg in `src/lib/prompts.ts` wordt gecontroleerd tegen het programmaboek. Afwijkingen worden als voorstel aan de gebruiker voorgelegd voor handmatige goedkeuring. Correcte uitleg blijft als instructielaag naast de programmaboek-referentie.

### Inkortlogica (intelligente selectie)
- **D-07:** Build-time AI-selectie — eenmalig een AI-analyse die het hele boek leest, de bestaande prompts/framework bekijkt, en per use case precies de relevante passages selecteert. Dit is een voorbereide kennisbank, geen dynamische retrieval.
- **D-08:** De theorie is statisch — het programmaboek verandert niet. De kwaliteit zit in het toepassen van het juiste deel op het juiste moment. Build-time selectie is daarom voldoende.

### Bereik van context-injectie
- **D-09:** Primair: DIN-mapping (generateDINMapping, din-suggest, din-create, batenprofiel). Alle momenten waarop baten, vermogens of inspanningen worden gegenereerd of aangescherpt.
- **D-10:** Secundair: cross-analyse — programmaboek-context voor theoretische toetsing op uitvoerbaarheid van resultaten.
- **D-11:** Buiten scope: export-generatie en sectorplan-analyse krijgen geen extra programmaboek-context.

### Claude's Discretion
- Exact opslagformaat voor geextraheerde secties (TypeScript constanten vs JSON)
- Structuur van het build-time extractie-script
- Implementatie van de zinsgrenzen-logica als fallback bij te lange secties
- Hoe de system prompt precies wordt samengesteld (volgorde van instructies + context)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Methodiek (primaire bron)
- `docs/programmaboek.doc` — Het volledige programmaboek (Prevaas & Van Loon). Researcher MOET dit lezen om hoofdstukstructuur te identificeren en mapping voor te stellen.

### AI Pipeline (te wijzigen)
- `src/lib/ai-client.ts` — `callClaude()` en `callClaudeWithValidation()` — centraal punt voor system prompt samenstelling
- `src/lib/prompts.ts` — Alle AI prompts met handgeschreven methodiek-uitleg die gecontroleerd moet worden tegen het boek

### AI Endpoints (die context krijgen)
- `src/app/api/din-mapping/route.ts` — DIN-keten generatie (primair)
- `src/app/api/din-suggest/route.ts` — Suggest/verbeter enkel DIN-item (primair)
- `src/app/api/cross-analyse/route.ts` — Cross-sector analyse (secundair)

### Bestaande .doc extractie (herbruikbaar patroon)
- `src/app/api/import-kib/route.ts` — Gebruikt mammoth.extractRawText voor .docx parsing
- `src/app/api/parse-sector/route.ts` — Gebruikt mammoth.extractRawText voor sectorplan parsing

### Types en schemas
- `src/lib/types.ts` — DINSession, DINBenefit, DINCapability, DINEffort type definities
- `src/lib/schemas.ts` — Zod schemas voor AI response validatie (uit Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mammoth` (v1.11.0): Al geinstalleerd, gebruikt in import-kib en parse-sector voor .doc/.docx tekst-extractie. Kan hergebruikt worden voor programmaboek-extractie.
- `callClaudeWithValidation`: Centraal AI-aanroeppatroon met Zod validatie en retry (uit Phase 1). System prompt parameter is de plek voor programmaboek-context.
- `src/lib/prompts.ts`: Alle prompt-constanten als named exports — nieuwe prompts of context-secties passen in dit patroon.

### Established Patterns
- **System prompt + user message**: `callClaude(systemPrompt, userMessage)` — programmaboek-context wordt onderdeel van systemPrompt
- **Named exports voor prompts**: `DIN_MAPPING_PROMPT`, `CROSS_ANALYSE_PROMPT`, etc. — context-secties kunnen als vergelijkbare exports
- **API route structuur**: Elke route importeert uit ai-client.ts en construeert prompt + message

### Integration Points
- `src/lib/ai-client.ts` functies (`generateDINMapping`, `generateCrossAnalyse`, etc.) construeren de user message en kiezen de system prompt — hier wordt programmaboek-context ingevoegd
- Build-time extractie-script moet draaien als npm script of als eenmalig hulpscript
- Geextraheerde secties moeten importeerbaar zijn vanuit `src/lib/` of vergelijkbare locatie

</code_context>

<specifics>
## Specific Ideas

- Het programmaboek is de autoriteitsbron — bij elk AI-moment moet de relevante sectie meegegeven worden, niet alleen bij aanmaken maar ook bij optimaliseren en aanscherpen
- De theorie is statisch, de kwaliteit zit in toepassing: het juiste deel op het juiste moment
- Bestaande prompt-tekst moet gecontroleerd worden tegen het boek — niet blind vervangen, maar vergelijken en correcties voorstellen die de gebruiker handmatig goedkeurt
- De researcher stelt de hoofdstuk-naar-use-case mapping voor, de gebruiker reviewt deze

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-programmaboek-context-pipeline*
*Context gathered: 2026-03-31*
