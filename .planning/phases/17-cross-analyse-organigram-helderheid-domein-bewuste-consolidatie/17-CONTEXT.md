# Phase 17: Cross-analyse organigram helderheid + domein-bewuste consolidatie - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Maak cross-analyse consolidatie dwingender en het organigram in stap 5 leesbaarder. Twee kern-mechanismen:

1. **Guards** in `mergeCapabilities`/`mergeEfforts` die sector-specifieke titels (geen PO/VO/Zakelijk in voorgesteldeNaam) en cross-domein effort-merges (items moeten identiek `domain` hebben) hard afwijzen.
2. **Beslismodel + tweede-niveau analyse**: AI stelt per cluster A (combineren) of B (apart houden/afstemmen) voor met onderbouwing, de gebruiker beslist, en per shared capability draait een vervolganalyse die efforts binnen-domein clustert zodat het stap 5 organigram per gedeeld vermogen laat zien welke inspanningen samen kunnen én welke apart blijven, mét domein-dekking.

Het organigram rendert per groep één duidelijke keuze (Variant A onder shared cap, of Variant B gedeelde inspanning over sector-specifieke caps — nooit beide) en toont de rationale "waarom gedeeld" direct.

**Out of scope:** nieuwe AI-modellen, Word-export aanpassingen, undo-flow voor tweede-niveau merges, retroactieve migratie van bestaande sessies met sector-specifieke titels (alleen waarschuwing-badge).

</domain>

<decisions>
## Implementation Decisions

### Title-guard & domain-guard

- **D-01:** Sector-naam detectie via **word-boundary regex** — `/\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\b/i`. Voorkomt valse positieven op "Protocol" / "VOldoende". Minimale lengte `>= 10` chars. Geldt voor zowel `mergeCapabilities` als `mergeEfforts`.
- **D-02:** Domein-guard in `mergeEfforts`: alle items moeten identiek `domain` hebben. Een Mens-item + Data-item merge gooit een harde error.
- **D-03:** Guards werken via **throw Error** in de pure functies. Error-message bevat de concrete reden (`'Titel bevat sector-naam "PO"'` of `'Cross-domein merge geblokkeerd: mens + data_systemen'`). UI try/catcht rond `onMerge`. Breekt NIET met Phase 8 pure-function pattern — error-pad is expliciet, happy path blijft pure.
- **D-04:** Handmatige merge-failure UI in `ConsolidationActionBar`: **inline error banner** (rode stijl) boven de bestaande `showConfirm`/`showAfstemmingsAdvies` sub-states, met exacte reden + actieknop "Herzie advies" (plus optioneel "Pas titel aan"). Combineren-knop disabled zolang de voorgestelde titel niet valideert. Past bij bestaande state-machine pattern (lijn 32-35 `ConsolidationActionBar.tsx`).
- **D-05:** Auto-apply van "combineren" aanbevelingen (bestaande `useEffect` lijn 108-162 `StapConsolidatie.tsx`) **skipt guard-falende clusters stil**. Gefaalde clusters krijgen een "Vereist review" badge (rood border-l) op hun `ClusterCard`. Na auto-apply toont één samenvattende toast: `"N clusters samengevoegd, M vereisen review"`. Auto-apply stopt niet.

### Herzie advies regeneration

- **D-06:** Regen is **per-cluster**, niet volledige stap 4. De AI herziet alleen de `{aanbeveling, reden, voorgesteldeNaam, afstemmingsStappen}` van één cluster op basis van: cluster items + originele advies + user-context uit textarea. Respons overschrijft het cluster in `stap4Result.consolidatieAdvies`.
- **D-07:** Per cluster een `context: string` veld op `ConsolidatieAdviesItem` (schema-extensie in `src/lib/schemas.ts`). Bewaart de user-context tussen revisies zichtbaar onder het cluster-kaartje ("Herzien met context: ..."), zodat duidelijk is waarom het advies veranderd is. Single source of truth — geen revisie-lijst.
- **D-08:** Nieuwe tak in bestaande `/api/din-suggest` route: `type === "consolidatie-herzien"`. Hergebruikt de bestaande `consolidatie-advies` prompt-pipeline (lijn 32-67 `din-suggest/route.ts`) maar met een Zod-gevalideerde response (`{aanbeveling, reden, voorgesteldeNaam, afstemmingsStappen}`) in plaats van vrij-vorm string array. Geen nieuwe route-file.
- **D-09:** Loading UX: **inline spinner in "Herzie advies" knop** + textarea disabled. Hergebruikt `isGenerating` pattern uit `ConsolidationActionBar.tsx` lijn 34-35. Geen wizard-level loader, geen overlay. De cluster-card blijft interactief voor andere clusters.

### Sub-effort analyse onder shared caps

- **D-10:** `analyzeEffortsUnderCapability` draait **uitsluitend tijdens stap 4 "Analyseer"** — na de consolidatie-advies generatie en na eventuele auto-apply van "combineren". Niet automatisch bij elke merge, niet via losse knoppen. Eén voorspelbaar moment, één loading state. Past bij Phase 11 D-11 (handmatige AI-trigger).
- **D-11:** Batching = **1 AI-call per shared capability, alle vier domeinen in één payload**. AI krijgt: de cap metadata + alle gekoppelde efforts gegroepeerd per `domain` + instructie "geef per domein een advies `combineren|apart_houden`, voorgesteldeNaam verplicht bij combineren, leeg bij apart_houden. Geen cross-domein merges.". Response is array van `SubEffortAdvies { domein, actie, items: string[], reden, voorgesteldeNaam: string|null }`. N shared caps = N sequentiële calls. Gekozen boven per-(cap×domein) omdat AI cross-domein context (bv. Mens-training ondersteunt Data-implementatie) wel moet kunnen meewegen, ook al mag het geen cross-domein merges adviseren. Gekozen boven mega-call vanwege token-druk en attention-drift risico.
- **D-12:** Cache-policy: **sticky**. `stap4Result.subEffortAnalysis` blijft intact bij refresh, edit van caps/efforts, en undo-merges. Verdwijnt alleen wanneer gebruiker (a) stap 4 opnieuw "Analyseer" klikt, of (b) "Herzie advies" op een cluster uitvoert — dan wordt de sub-analyse van de getroffen shared caps geïnvalideerd en bij de volgende analyse opnieuw gegenereerd. Gebruiker houdt volledige controle, geen spooky re-computes.
- **D-13:** Empty shared caps (geen efforts gekoppeld) = **skip AI-call** + toon empty-state: `"Nog geen inspanningen gekoppeld aan dit gedeelde vermogen"` (discrete grijze tekst onder de cap in het organigram). Geen verspilde tokens.

### Organigram A/B groep-logica (StapSectorVertaling)

- **D-14:** Een "groep" = **betrokken sector-combinatie**. Binnen zo'n sector-scope geldt: als er een shared cap is → Variant A (efforts onder de cap). Alleen als er GEEN shared cap is maar wel een effort die meerdere sector-specifieke caps overspant → Variant B. Shared cap beats shared effort — eenvoudige, voorspelbare regel.
- **D-15:** Bij A-vs-B conflict (effort gekoppeld aan één shared cap ÉN aan meerdere sector-specifieke caps uit andere structuren): **Variant A wint absoluut**. De effort rendert alleen onder de shared cap. De sector-specifieke links verschijnen als subtiele `"Dient ook: {sector}/{cap-titel}"` hint-badge onder de effort. Voorkomt dubbel tonen en sluit aan bij roadmap-regel "Variant B geskipped als shared cap bestaat".
- **D-16:** Domein-balans badge **per shared cap, lokaal gescoped**. Telt unieke `domain`-waarden van efforts die direct onder die cap hangen. Weergave: `"Dekt 3 van 4 domeinen — mist Cultuur"` (groen ≥3, amber 2, rood ≤1). Geen globale focusdoel-badge. Per-cap actionable.
- **D-17:** Sub-effort advies rendering = **color-coded domein-sectie binnen de shared-cap card**. Bestaande `DOMAIN_COLORS` map (`StapSectorVertaling.tsx` lijn 29-34) hergebruikt voor achtergronden. Per domein een compacte sectie: actie-badge (combineren/apart_houden met Phase 13 kleurconventie), korte reden, `voorgesteldeNaam` indien combineren, en de betrokken effort-titels als chip-list. Lege domeinen greyed-out/geskipped — niet verborgen zodat domein-gap zichtbaar blijft. Renders binnen het bestaande sharedCap-blok in de organigram-loop, niet als aparte sectie.

### Schema & prompt aanpassingen

- **D-18:** `Stap4ResultSchema` krijgt optionele `subEffortAnalysis: SubEffortAdvies[]` top-level, met `SubEffortAdvies = { sharedCapId: string, domein: 'mens'|'processen'|'data_systemen'|'cultuur', actie: 'combineren'|'apart_houden', items: string[], reden: string, voorgesteldeNaam: string|null }`. Geïndexeerd op `sharedCapId + domein`.
- **D-19:** `ConsolidatieAdviesItem` (schema + type) krijgt optioneel `context: string` voor de user-textarea (D-07).
- **D-20:** Stap 3 prompt (`CROSS_ANALYSE_STAP3_PROMPT` regel 193-224 in `prompts.ts`) wordt uitgebreid: "Cluster inspanningen ALLEEN binnen hetzelfde `domein` — een Mens-item hoort niet in een cluster met een Data-item. Voorgestelde namen zijn sectoroverstijgend (geen PO/VO/Zakelijk).".
- **D-21:** Stap 4 prompt (`CROSS_ANALYSE_STAP4_PROMPT` regel 226-315) krijgt: "Aanbeveling `combineren` is alleen toegestaan wanneer alle cluster-items hetzelfde `domein` hebben. `voorgesteldeNaam` is verplicht bij `combineren` en MOET sectoroverstijgend zijn (geen PO/VO/Zakelijk substrings).". Bestaande citobreedInzicht blok blijft intact.
- **D-22:** Nieuwe prompt `SUB_EFFORT_ANALYSE_PROMPT` in `prompts.ts` voor de per-cap sub-analyse (D-11 contract). Gebruikt dezelfde layered-context (programmaboek + KiB) via `assembleSystemPrompt`.

### Legacy data (sessies van voor Phase 17)

- **D-23:** Bestaande sessies met sector-specifieke shared-cap/effort titles krijgen een **warning badge** `"Legacy titel"` (amber) op de organigram-kaart — geen automatische rename, geen blocking. Gebruiker kan via "Herzie advies" de titel laten herzien door AI. Geen destructieve migratie, sluit aan bij Phase 13 D-10 (try/catch + soft fallback).

### Test coverage

- **D-24:** Bestaande `src/lib/__tests__/consolidation.test.ts` blijft groen. Nieuwe test-cases:
  - `mergeCapabilities` throws bij titel met "PO"/"VO"/"Zakelijk"
  - `mergeCapabilities` throws bij titel < 10 chars
  - `mergeEfforts` throws bij cross-domein items
  - `mergeEfforts` accepteert same-domein items met neutrale titel
  - Word-boundary regex accepteert "Protocol" en "VOldoende" (geen false positives)
  - Auto-apply loop in `StapConsolidatie` skipt guard-falers (via pure helper extraheren voor test-baarheid)

### Claude's Discretion

- Exacte Tailwind-klassen voor error-banner styling (mits rood/herkenbaar)
- Component-opsplitsing van sub-effort rendering binnen `StapSectorVertaling.tsx` (eigen `<SubEffortSection>` of inline)
- Precieze copy van error-berichten mits gebruiker duidelijk begrijpt wat er moet gebeuren
- Hoe de auto-apply summary-toast exact geformatteerd wordt (N/M tellers + tijdsduur)
- Of `SUB_EFFORT_ANALYSE_PROMPT` als losse constant of inline in een helper functie leeft
- Folder-structuur voor eventuele nieuwe pure helpers (bv. `src/lib/consolidation-guards.ts` of inline in `CrossAnalyseStep.tsx`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Te wijzigen bronbestanden
- `src/components/steps/CrossAnalyseStep.tsx` — `mergeCapabilities`/`mergeEfforts` (regel 9-146) krijgen guards (D-01, D-02, D-03)
- `src/components/cross-analyse/StapConsolidatie.tsx` — auto-apply effect (regel 108-162) krijgt guard try/catch (D-05), per-cluster textarea + herzie-advies knop bedrading (D-06/D-07/D-08)
- `src/components/cross-analyse/shared/ClusterCard.tsx` — context-textarea prop + herzie knop (regel 21-90)
- `src/components/cross-analyse/shared/ConsolidationActionBar.tsx` — error-banner state + disabled combineren (D-04), inline spinner tijdens regen (D-09)
- `src/components/cross-analyse/StapSectorVertaling.tsx` — A/B logica (D-14/D-15), domein-balans badge (D-16), sub-effort rendering (D-17)
- `src/lib/schemas.ts` — `Stap4ResultSchema` + `VermogenClusterItemSchema`/`InspanningClusterItemSchema` schema extensies (D-18/D-19); nieuwe `SubEffortAdviesSchema`
- `src/lib/types.ts` — afgeleide types voor `SubEffortAdvies`, `ConsolidatieAdviesItem.context`
- `src/lib/prompts.ts` — stap 3 prompt uitbreiding (D-20), stap 4 prompt uitbreiding (D-21), nieuwe `SUB_EFFORT_ANALYSE_PROMPT` (D-22)
- `src/app/api/din-suggest/route.ts` — nieuwe tak `type === "consolidatie-herzien"` (D-08)
- `src/app/api/cross-analyse/route.ts` — stap 4 branch draait ook `analyzeEffortsUnderCapability` na consolidatie-advies call (D-10)
- `src/lib/__tests__/consolidation.test.ts` — nieuwe test-cases (D-24)

### Hergebruik-patronen (niet wijzigen)
- `src/lib/ai-client.ts` — `callClaudeWithValidation()` voor alle AI-calls met Zod retry
- `src/lib/prompt-assembly.ts` — `assembleSystemPrompt()` voor layered context in `SUB_EFFORT_ANALYSE_PROMPT`
- `src/lib/session-context.tsx` — `updateSession(prev => ...)` functionele updaters voor alle state-mutaties
- `src/components/cross-analyse/shared/SectorBadge.tsx` — bestaande sector-kleur badge
- `DOMAIN_COLORS` map in `StapSectorVertaling.tsx` regel 29-34 — hergebruikt in sub-effort rendering

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek, 4 inspanningsdomeinen (Mens/Processen/Data & Systemen/Cultuur); baten zijn sector-specifiek, vermogens en inspanningen kunnen gedeeld zijn maar alleen binnen-domein samengevoegd

### Prior context
- `.planning/phases/08-cross-analyse-semantische-matching/08-CONTEXT.md` — D-09/D-10 (consolidatie met `consolidated` flag + undo), D-03 (baten NIET matchen); D-11 (geconsolideerde items tonen keten)
- `.planning/phases/11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie/11-CONTEXT.md` — D-11 (handmatig Analyseer-knop), D-12 (cumulatieve context per stap), D-13 (optioneel context-veld per stap)
- `.planning/phases/13-stap-5-cross-analyse-prioriteitsview-eerste-doel/13-CONTEXT.md` — D-04/D-05 kleurbadge conventies (groen=ok, amber=aandacht, rood=risico), D-10 legacy-data soft fallback pattern

### Requirements
- `.planning/REQUIREMENTS.md` — R-CROSS-01, R-CROSS-02 (cross-analyse helderheid en consolidatie-kwaliteit)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mergeCapabilities` / `mergeEfforts` (`CrossAnalyseStep.tsx` regel 9-146) — pure functies die al `suggestedTitle` parameter accepteren; guards erbij voegen is additive
- `ConsolidationActionBar` state-machine (`ConsolidationActionBar.tsx` regel 32-35: `showConfirm`, `showAfstemmingsAdvies`, `generatedAdvice`, `isGenerating`) — perfect voor toevoegen van `showGuardError` en `showHerzieAdvies` sub-states
- Auto-apply useEffect (`StapConsolidatie.tsx` regel 108-162) — al gestructureerd met try-blocks per cluster, error-catch toevoegen is mechanisch
- `findSuggestedTitle` helper (`StapConsolidatie.tsx` regel 99-105) — al koppelt cluster aan stap4 `voorgesteldeNaam`
- Bestaande `/api/din-suggest` `consolidatie-advies` tak (`din-suggest/route.ts` regel 32-67) — direct prompt → JSON array pattern, te klonen voor `consolidatie-herzien` met Zod schema
- `DOMAIN_COLORS` + `DOMAIN_LABELS` maps (`StapSectorVertaling.tsx` regel 22-34) — color-coded rendering voor sub-effort secties
- Variant A/B rendering in `StapSectorVertaling.tsx` regel 232-493 — beide varianten al aanwezig, Phase 17 moet ze mutually exclusive maken via D-14/D-15 logica
- `ConsolidatieAdviesItem` met `afstemmingsStappen`/`voorgesteldeNaam`/`reden` (`schemas.ts` regel 445-462) — al bijna compleet, alleen `context?: string` toevoegen

### Established Patterns
- Pure consolidation functions met throw-op-error (Phase 8)
- State machines binnen ConsolidationActionBar voor multi-step interacties
- Functionele `updateSession(prev => ...)` voor alle state-mutaties
- Zod-first validatie voor alle AI responses met retry
- Layered `assembleSystemPrompt()` context voor alle AI-calls
- Auto-apply effect met `autoApplied` guard om dubbele runs te voorkomen
- Toast-systeem voor niet-blokkerende feedback

### Integration Points
- Stap 4 AI-flow (`/api/cross-analyse` met `stap === 4`) moet na de `CROSS_ANALYSE_STAP4_PROMPT` call ook `analyzeEffortsUnderCapability` draaien voor alle shared caps — loop binnen dezelfde request of sequentieel
- `stap4Result` wordt opgeslagen in `session.crossAnalyseWizard.stepResults.stap4` — extending met `subEffortAnalysis` vereist `updateSession(prev => {...})` in `CrossAnalyseWizard.tsx`
- `StapConsolidatie` rendert `ClusterCard` met `cluster` prop — textarea + context moeten via `ClusterCardProps` doorgepropt worden
- `StapSectorVertaling` leest `result` (= `stap4Result.stap5` — maar hier nodig: `stap4Result.subEffortAnalysis`) via de wizard — prop-signature uitbreiden of combineren
- Legacy sessie-detectie: bij inladen van `stap4Result` lokaal valideren of bestaande `voorgesteldeNaam`-velden door de nieuwe guard-regex zouden falen → warning badge (D-23)

</code_context>

<specifics>
## Specific Ideas

- **Guards zijn de enige bescherming tegen AI-hallucinatie.** AI krijgt een expliciete instructie (D-20/D-21) om sectoroverstijgende titels te produceren en alleen binnen-domein te clusteren, maar de guards in de pure functies zijn de harde backstop als AI faalt. De prompt-instructies zijn zachte suggesties, de code-guards zijn dwingend — beide nodig.
- **Shared cap wint van shared effort.** De organigram hiërarchie is: focusdoel → baten → gedeelde vermogens → (per domein) sub-effort-clusters. Variant B (gedeelde inspanning over sector-specifieke caps) is een edge-case voor wanneer er geen shared cap is. De regel "shared cap beats shared effort" geeft voorspelbare UI.
- **Per-domein clustering binnen één cap geeft de juiste analyse-diepte.** Zelfs als twee Mens-efforts onder dezelfde shared cap hangen maar volledig verschillend zijn, moet de sub-analyse ze apart laten. AI krijgt daarom per domein-bucket een binaire keuze (combineren/apart_houden) — geen middenweg. Het organigram visualiseert beide uitkomsten in dezelfde color-coded sectie zodat gebruiker ziet: "Mens: 1 gecombineerd + 2 apart, Processen: 1 apart".
- **Context-textarea is audit trail + AI-sturing in één.** Door de context per cluster op te slaan (D-07), ziet de gebruiker niet alleen waarom het advies veranderd is, maar blijft de context ook beschikbaar voor een volgende "herzie" of een review-sessie. Geen revisie-lijst nodig — de huidige context is altijd de geldige.
- **Sticky cache beschermt werk.** Gebruikers die een sub-effort analyse hebben en daarna een kleine effort-edit doen, willen niet dat hun cache verdwijnt. Alleen expliciete "Analyseer" of "Herzie" acties invalideren — dat is het mentale model van de rest van de wizard (Phase 11 D-11).

</specifics>

<deferred>
## Deferred Ideas

- **Retroactieve titel-migratie** voor bestaande sessies met sector-specifieke shared-cap/effort titles — roadmap expliciet out of scope. Alleen warning badge (D-23). Kan later een aparte migratie-phase worden.
- **Undo voor tweede-niveau merges** (sub-effort combineren → uit elkaar halen) — roadmap expliciet out of scope. Huidige sub-effort advies is "adviserend", feitelijke merges gebeuren alleen op cap/effort niveau via bestaande mergeCapabilities/mergeEfforts flow.
- **Word-export ondersteuning voor sub-effort analyse** — out of scope. Stap 5 organigram is de primaire rendering; export kan later bijgewerkt worden als er vraag is.
- **Revisie-historie per cluster** — D-07 kiest voor "overschrijven met context-veld". Als later een audit-log nodig blijkt, kan `revisions: ConsolidatieAdviesRevision[]` toegevoegd worden zonder schema-breuk.

</deferred>

---

*Phase: 17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie*
*Context gathered: 2026-04-10*
