# Phase 4: AI Output Kwaliteit - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

AI genereert methodiek-conforme DIN-elementen (baten, vermogens, inspanningen) die de gebruiker kan presenteren aan stakeholders. Dit omvat: prompt-verbetering voor betere generatie, code-validatie tegen methodiekregels, KiB-context injectie in alle AI-prompts, en hoeveelheidslimieten. Bestaande items worden ook gevalideerd (niet alleen AI-output).

</domain>

<decisions>
## Implementation Decisions

### Validatiestrategie
- **D-01:** Dual validatie: prompts sturen de AI aan om methodiek-conforme output te genereren, EN aparte validatiefuncties in code controleren elk item achteraf op methodiekregels (vergrotende trap voor baten, werkwoorden voor vermogens, domeintoewijzing voor inspanningen).
- **D-02:** Validatie geldt voor ALLE items — zowel AI-gegenereerde als handmatig ingevoerde baten, vermogens en inspanningen. Consistentie over de hele sessie.
- **D-03:** Bij validatiefalen: stille correctie waar mogelijk (bijv. werkwoord verwijderen uit baat-titel). De gebruiker ziet het gecorrigeerde resultaat en kan bijsturen via extra prompt of handmatige aanpassing. Geen harde blokkade.

### KiB context-injectie
- **D-04:** KiB-data (top-doelen + scope) wordt als apart blok in de system prompt geplaatst, na de programmaboek-context. Past bij het bestaande prompt-assembly patroon uit Phase 3.
- **D-05:** Alleen top-doelen (alle, met beschrijving en ranking) en scope (in/buiten) worden meegegeven. Geen visietekst — doelen en scope geven voldoende richting.
- **D-06:** KiB-context gaat mee bij ALLE AI-aanroepen: din-mapping, suggest, create, cross-analyse. Consistent en voorkomt dat AI buiten scope genereert (AI-03 requirement).

### Hoeveelheidslimieten
- **D-07:** Baten-limiet (2-4 per doel per sector) wordt afgedwongen via prompt-instructie EN Zod schema `.max(4)`. Dubbele zekerheid.
- **D-08:** Vergelijkbare limieten gelden voor vermogens en inspanningen bij AI-generatie (bijv. max 3-5 vermogens per baat, max 2-4 inspanningen per vermogen). Exacte aantallen door Claude te bepalen op basis van methodiek.
- **D-09:** Limieten gelden alleen voor AI-generatie. De gebruiker kan handmatig extra items toevoegen boven de limiet als dat wenselijk is.

### Validatiefeedback
- **D-10:** Gecorrigeerde items tonen een inline correctie-badge op de kaart (bijv. "Gecorrigeerd: titel aangepast") die na bekijken verdwijnt. Subtiel maar informatief.
- **D-11:** Geen apart validatie-overzicht per generatieronde — feedback per item is voldoende.
- **D-12:** Bijsturen van gecorrigeerde items gaat via de bestaande "Aanscherpen met AI" functie op de kaart. Geen nieuwe UI nodig voor bijsturing.

### Claude's Discretion
- Exacte methodiekregels per DIN-type extraheren uit prompts.ts en programmaboek-context naar validatiefuncties
- Correctielogica per regeltype (welke correcties automatisch, welke alleen markeren)
- Exacte limieten voor vermogens en inspanningen op basis van methodiek
- Structuur van het validatieresultaat-object (warnings, corrections, passed)
- Badge-styling en verdwijntiming voor correctie-indicatie

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Methodiek (validatieregels)
- `docs/programmaboek.doc` — DIN-methodiek definities, formuleringsregels voor baten/vermogens/inspanningen
- `src/lib/prompts.ts` — Bestaande methodiekregels in prompt-vorm (vergrotende trap, werkwoorden-check, domeinen). Bron voor extractie naar validatiefuncties.
- `src/lib/programmaboek-context.ts` — Geextraheerde programmaboek-secties per DIN-type

### AI Pipeline (te wijzigen)
- `src/lib/ai-client.ts` — `callClaudeWithValidation()` met retry-loop, `parseAIResponse()` voor Zod validatie
- `src/lib/prompt-assembly.ts` — `assembleSystemPrompt()` die instructies + context combineert. Uitbreiden met KiB-context blok.
- `src/lib/schemas.ts` — Zod schemas voor AI responses. Uitbreiden met `.max()` limieten.

### AI Endpoints (alle krijgen KiB-context)
- `src/app/api/din-mapping/route.ts` — DIN-keten generatie
- `src/app/api/din-suggest/route.ts` — Suggest/verbeter enkel DIN-item
- `src/app/api/cross-analyse/route.ts` — Cross-sector analyse

### Session & KiB Data
- `src/lib/session-context.tsx` — SessionProvider met KiB-data (goals, scope) die geextraheerd moet worden voor prompts
- `src/lib/types.ts` — DINSession interface met goals, scope, vision velden

### UI Componenten (correctie-badge)
- `src/components/din/BenefitCard.tsx` — Baat-kaart waar inline badge getoond moet worden
- `src/components/din/DINCreatieWizard.tsx` — Creatie-wizard, validatie na wizard-stappen

### Requirements
- `.planning/REQUIREMENTS.md` — AI-02 (max 2-4 baten), AI-03 (KiB context), AI-04 (methodiek-validatie)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prompts.ts` (612 regels): Bevat al expliciete methodiekregels per DIN-type (vergrotende trap, werkwoorden-check, domeinen). Deze regels kunnen geextraheerd worden naar validatiefuncties.
- `ai-client.ts`: `callClaudeWithValidation<T>()` met retry-loop en `ParseResult<T>` patroon. Kan uitgebreid worden met post-validatie stap.
- `prompt-assembly.ts`: `assembleSystemPrompt()` met use-case mapping. Kan uitgebreid worden met KiB-context blok.
- `schemas.ts`: Zod schemas voor alle AI responses. Structurele validatie al op orde.
- `programmaboek-context.ts`: Per-sectie programmaboek-extracten (BATEN, VERMOGENS, INSPANNINGEN). Al geintegreerd in system prompts.
- Toast-systeem uit Phase 2: `ToastProvider` + `useToast()` hook, herbruikbaar voor correctie-meldingen.

### Established Patterns
- Build-time extractie voor statische content (Phase 3 patroon)
- System prompt = instructie + "---" + context + "---" + referentie
- Zod `.optional().default()` voor flexibele AI-output
- `parseAIResponse<T>()` retourneert `ParseResult<T>` met success/error/retryable
- BenefitCard heeft al "Aanscherpen met AI" knop en feedback-veld

### Integration Points
- `prompt-assembly.ts` `assembleSystemPrompt()`: KiB-context blok toevoegen na programmaboek-context
- `ai-client.ts`: Post-validatie stap na Zod validatie succeeds
- `schemas.ts`: `.max()` toevoegen aan AI response array schemas
- BenefitCard/CapabilityCard/EffortCard: Inline correctie-badge component
- Session context: KiB goals en scope extraheren voor prompt-injectie

</code_context>

<specifics>
## Specific Ideas

- Correctie is transparant: gebruiker ziet WAT er gecorrigeerd is (niet alleen dat het gecorrigeerd is)
- Gebruiker kan altijd bijsturen via bestaande "Aanscherpen met AI" functie of handmatige bewerking
- Limieten gelden voor AI, niet voor de gebruiker — handmatig toevoegen blijft mogelijk
- KiB doelen + scope als vaste achtergrond in alle AI-aanroepen, zodat AI nooit "in het wilde weg" genereert

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ai-output-kwaliteit*
*Context gathered: 2026-04-01*
