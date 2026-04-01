# Phase 5: Sectorwerk Doorstroming - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Sectorwerk-analyse resultaten worden opgeslagen als getypeerde objecten (niet als markdown strings) en stromen door als gestructureerde input voor DIN-mapping. De gebruiker ziet suggesties uit de sectorwerk-analyse bij het uitwerken van DIN-elementen, en de AI krijgt de analyse als extra context mee. De SectorWerkStep toont de analyse in een gestructureerde kaart-weergave.

</domain>

<decisions>
## Implementation Decisions

### Opslagstructuur
- **D-01:** `sectorAnalyses` in DINSession wordt gewijzigd van `Record<string, string>` naar `Record<string, SectorplanAnalyseResult>`. Het Zod schema in `schemas.ts` wordt aangepast.
- **D-02:** `SectorWerkStep.tsx` stopt met JSON.stringify van het API-resultaat en slaat het gevalideerde object direct op.

### Suggestie-weergave in DIN-mapping
- **D-03:** Een inklapbaar suggestiepaneel bovenaan de DIN-mapping stap toont per sector de baten-suggesties uit de sectorwerk-analyse. Alleen baten worden getoond — vermogens en inspanningen worden door de AI gegenereerd op basis van de baat.
- **D-04:** Klik op [+] bij een suggestie neemt de baat direct over als nieuw item in de sessie. Geen wizard-tussenstap.
- **D-05:** Overgenomen suggesties worden visueel gemarkeerd (doorgestreept of grijs) in het paneel. Ze blijven zichtbaar als referentie.

### AI context-injectie
- **D-06:** Sectorwerk-analyse wordt als apart blok in de system prompt geplaatst, na programmaboek-context en KiB-context. Past bij het bestaande prompt-assembly patroon uit Phase 3/4.
- **D-07:** Sectorwerk-context gaat alleen mee bij DIN-generatie endpoints (din-mapping, din-suggest). Niet bij cross-analyse of export.

### Migratie bestaande data
- **D-08:** Bij het openen van een bestaande sessie: als `sectorAnalyses` een string bevat, probeer `JSON.parse` + Zod validatie. Als het JSON is dat valideert → migreer stilletjes. Als het markdown of ongeldige data is → verwijder en toon melding dat heranalyse nodig is. Consistent met Phase 1 D-08 (stille defaults bij laden).

### Weergave in SectorWerkStep
- **D-09:** Sectorwerk-analyse wordt getoond als gestructureerde kaarten per categorie: samenvatting bovenaan, dan aansluiting bij doelen, baten-suggesties, vermogens-suggesties, en inspanningen per domein.
- **D-10:** Inspanningen in de analyse-weergave worden gegroepeerd per domein met de standaard DIN-kleuren (Mens=blauw `#2563eb`, Processen=groen `#059669`, Data & Systemen=paurs `#7c3aed`, Cultuur=amber `#d97706`). Consistent met de rest van de app.

### Claude's Discretion
- Exacte layout en styling van het suggestiepaneel in DIN-mapping (positie, grootte, animatie)
- Hoe de sectorwerk-context wordt geformateerd in de system prompt (proza vs structured)
- Migratie-implementatie details (waar in de laadcyclus, foutafhandeling)
- Exacte kaart-layout voor de analyse-weergave in SectorWerkStep (grid, spacing, responsive)
- Of er een "alle suggesties overnemen" batch-knop komt naast individuele [+] knoppen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sectorwerk (te wijzigen)
- `src/components/steps/SectorWerkStep.tsx` — Huidige sectorwerk-stap, stringifyt analyse-resultaat, toont als platte tekst
- `src/app/api/analyze-sectorplan/route.ts` — API endpoint dat al gestructureerd object retourneert via `AISectorplanAnalyseSchema`
- `src/lib/prompts.ts` — `SECTORPLAN_ANALYSE_PROMPT` voor de sectorplan-analyse AI-aanroep

### DIN-mapping (suggestiepaneel toevoegen)
- `src/components/steps/DINMappingStep.tsx` — Huidige DIN-mapping stap, ontvangt `sectorAnalysis` als string, stuurt door naar API
- `src/app/api/din-mapping/route.ts` — DIN-generatie endpoint, ontvangt sectorAnalysis als string context
- `src/app/api/din-suggest/route.ts` — DIN-suggest endpoint

### Types en schemas
- `src/lib/schemas.ts` — `AISectorplanAnalyseSchema` (lijn ~455), `DINSessionSchema.sectorAnalyses` (lijn ~337, nu `Record<string, string>`)
- `src/lib/types.ts` — Afgeleide types uit schemas

### AI Pipeline
- `src/lib/ai-client.ts` — `callClaudeWithValidation()` centraal AI-aanroeppatroon
- `src/lib/prompt-assembly.ts` — `assembleSystemPrompt()` voor system prompt opbouw (programmaboek + KiB context)

### Session management
- `src/lib/session-context.tsx` — SessionProvider met `updateSession` callback API, laadt sessies uit localStorage
- `src/lib/persistence.ts` — `loadLocal`/`saveLocal` functies

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek referentie (batenprofielen, inspanningsdomeinen)

### Domein-kleuren (hergebruiken)
- `src/app/globals.css` — DIN domein-kleur tokens
- `src/components/steps/DINMappingStep.tsx` — Bestaande domein-kleurconstanten (`DOMAIN_DOT_COLORS`, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AISectorplanAnalyseSchema` in `schemas.ts`: Al volledig gedefinieerd met secties (samenvatting, aansluiting, baten, vermogens, inspanningen per domein). Dit schema wordt de basis voor zowel opslag als weergave.
- `assembleSystemPrompt()` in `prompt-assembly.ts`: Bestaand patroon voor context-blokken in system prompt. Sectorwerk-context past als nieuw blok.
- Domein-kleurconstanten (`DOMAIN_DOT_COLORS`, `DOMAIN_LABELS`): Al beschikbaar in DINMappingStep, herbruikbaar voor inspanningen-weergave in SectorWerkStep.
- Toast-systeem uit Phase 2: Herbruikbaar voor migratie-meldingen ("Sectorwerk-analyse opnieuw uitvoeren").
- BenefitCard component: Bestaand kaart-patroon voor baten, kan als referentie voor suggestie-items.

### Established Patterns
- System prompt = instructie + `---` + programmaboek-context + `---` + KiB-context. Sectorwerk wordt het vierde blok.
- `callClaudeWithValidation<T>()` met Zod schema validatie en retry-loop.
- Functionele `updateSession(prev => ...)` callback API voor state updates.
- `Record<string, T>` patroon voor sector-geindexeerde data (al gebruikt voor `integratieAdvies`, `verrijkteSectorplannen`).

### Integration Points
- `SectorWerkStep.tsx` lijn 100-108: Hier wordt het API-resultaat nu gestringifyd — dit wordt direct object-opslag.
- `DINMappingStep.tsx` lijn 890-892: Hier wordt `sectorAnalyses?.[activeSector]` als string doorgestuurd — wordt gestructureerd object.
- `schemas.ts` lijn 337: `sectorAnalyses: z.record(z.string(), z.string())` → wordt `z.record(z.string(), AISectorplanAnalyseSchema)`.
- `prompt-assembly.ts`: Nieuwe functie `extractSectorwerkContext()` voor system prompt blok.

</code_context>

<specifics>
## Specific Ideas

- Het suggestiepaneel in DIN-mapping toont alleen baten uit de analyse — vermogens en inspanningen worden door de AI gegenereerd op basis van de overgenomen baat (past bij het DIN-keten patroon)
- Direct overnemen met [+] knop, geen wizard-tussenstap — snelheid is belangrijk
- Overgenomen suggesties worden visueel gemarkeerd (doorgestreept/grijs) maar blijven zichtbaar
- Inspanningen in de SectorWerkStep-weergave altijd met domein-kleuren (Mens=blauw, Processen=groen, Data & Systemen=paars, Cultuur=amber) — consistent met de rest van de app
- Stille migratie bij laden van bestaande sessies, consistent met Phase 1 aanpak

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-sectorwerk-doorstroming*
*Context gathered: 2026-04-02*
