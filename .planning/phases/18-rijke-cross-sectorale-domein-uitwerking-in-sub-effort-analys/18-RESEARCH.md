# Phase 18: Rijke cross-sectorale domein-uitwerking in sub-effort analyse - Research

**Researched:** 2026-04-20
**Domain:** Zod schema-uitbreiding, prompt engineering (Claude Opus 4.7), Next.js API route wiring, React card rendering, DIN-methodiek (Werken aan Programma's — Hfst 11.3 Inspanningendossier)
**Confidence:** HIGH (alle beweringen zijn geverifieerd tegen de feitelijke bestanden; geen `[ASSUMED]` claims)

## Summary

Phase 18 verrijkt het `SubEffortAdviesSchema` (Phase 17, D-30) van een minimalistische advies-entry (`{groepId, domein, actie, items, reden, voorgesteldeNaam}`) naar een volledig uitgewerkte cross-sectorale inspanning met titel, beschrijving, beargumentatie, vermogen-impact per sector en een compleet `InspanningsDossier`. De bestaande Phase 17 pijplijn (`/api/cross-analyse` stap 4 → parallel `SUB_EFFORT_ANALYSE_PROMPT` per `VermogenGelijkenisGroep`) blijft structureel intact — we breiden schema, prompt, route-payload en UI uit.

Het bestaande `InspanningsDossierSchema` in `schemas.ts:88-94` is 1-op-1 herbruikbaar (eigenaar/inspanningsleider/verwachtResultaat/kostenraming/randvoorwaarden) en dekt exact de 5 dossier-velden die de roadmap vraagt. De focus-doel beschrijving stroomt al via `body.goals` (gefilterd naar `focusGoals` in `CrossAnalyseWizard.tsx:204-205`) naar de API — het veld is server-side beschikbaar in `body.goals[0].description`. Rendering hergebruikt de bestaande domein-kaart layout in `StapSectorVertaling.tsx:380-422` en wordt verrijkt met rijkere content-blokken.

**Primary recommendation:** Breid `SubEffortAdviesSchema` uit met 5 optionele velden (titel, beschrijving, beargumentatie, vermogenImpact, dossier), hergebruik `InspanningsDossierSchema` 1-op-1, stuur `focusDoelContext` als extra user-message-blok in de parallelle AI-calls, en breid de bestaande domein-card uit tot een 4-sectie-kaart (Bundel-identiteit / Hefboom-rationale / Vermogen-impact / Dossier) met Cito-brand colors en expand/collapse voor dossier-details.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema uitbreiding (5 optionele velden + type-inference) | Shared lib (`src/lib/schemas.ts`) | — | Single source of truth per D-10 Phase 1; z.infer exports geven types aan alle lagen |
| Prompt contract (wat moet AI leveren) | Shared lib (`src/lib/prompts.ts`) | — | Prompts zijn pure strings; geen runtime state |
| AI-call orchestratie + payload compositie | API / Backend (`src/app/api/cross-analyse/route.ts`) | — | Server-side AI call met `callClaudeWithValidation`; payload assemblage in `Promise.all` branch |
| Rich rendering per domein-kaart | Frontend Server (React component) | Browser (hover/expand states) | StapSectorVertaling is een `"use client"` component; Dossier expand/collapse is client-side state |
| Demo-data fixture | Shared lib (`src/lib/demo-data.ts`) | — | Pure data-functie, geen I/O; hergebruikt in homepage "Laad demo" |
| Schema validatie tests | Shared lib tests (`src/lib/__tests__/`) | — | `vitest.config.ts:11` filtert op `*.test.ts` (geen `.tsx`); schema-tests zijn pure TS |

## User Constraints (afgeleid uit ROADMAP.md Phase 18 + CLAUDE.md)

### Locked Decisions (uit ROADMAP.md success criteria)

1. `SubEffortAdviesSchema` breidt met VELDEN: `titel`, `beschrijving`, `beargumentatie`, `vermogenImpact[]`, `dossier{}` — alle `.optional()` voor backward compat
2. `SUB_EFFORT_ANALYSE_PROMPT` ontvangt EXPLICIET: focus-doel beschrijving + sector-context per vermogen
3. `/api/cross-analyse` stap 4 stuurt focus-doel beschrijving mee naar de parallelle sub-effort calls
4. `StapSectorVertaling.tsx` rendert een RIJKE kaart per sub-effort advies (titel, beschrijving, vermogen-impact lijst, dossier)
5. Demo-data heeft ALLE 4 domeinen met volledig dossier
6. `npm run build` + `npx vitest run` slagen groen

### Project-brede constraints (uit CLAUDE.md)

- **Alle UI en AI output in nl-NL** — geen Engelse termen
- **Cito blauw `#003366`** als primaire kleur; domein-kleuren per CLAUDE.md: mens `#2563eb` (blauw), processen `#059669` (groen), data_systemen `#7c3aed` (paars), cultuur `#d97706` (amber)
- **UX design voor alle output** — geen platte tekst; "elke output is een professioneel document"
- **Direct committen en pushen na elke werkende wijziging** — per feature, kleine commits
- **Dual persistence**: localStorage-first, dan async Supabase — maar Phase 18 raakt GEEN persistence code; subEffortAnalysis is al onderdeel van `stap4Result` dat via `wizardState.stepResults.stap4` loopt
- **Verplichte verificatie bij elke feature**: `npm run build` + functionele controle + skills-gebruik + methodiek-check tegen `docs/programmaboek.doc`

### Claude's Discretion

- Vormgeving van de rijke domein-kaart (layout, grid, expand/collapse gedrag, typografie-scale)
- Vertaling van "vermogen-impact per sector" naar UI (bullet-lijst, 3-kolom grid, accordeon?)
- Prompt-volgorde van informatie-blokken in `SUB_EFFORT_ANALYSE_PROMPT` (focus-doel eerst vs. last; sector-context per vermogen inline of als aparte sectie)
- Maximum dossier-veld-lengte in prompts (kostenraming: exact bedrag? range? jaarbudget?)
- Kleurgebruik binnen de domein-kaart: subtiele tint vs. full-bleed banner

### Deferred Ideas (OUT OF SCOPE)

- Word-export ondersteuning voor subEffortAnalysis (expliciet out-of-scope in Phase 17 + Phase 18 erft dat)
- Retroactieve migratie van bestaande sessies (backward-compat via `.optional()` volstaat)
- Edit/undo van AI-gegenereerde dossier-velden (review-flow wordt in een toekomstige fase behandeld)
- Nieuwe AI-modellen (we blijven op `claude-opus-4-7`, conform `route.ts:213`)
- Split van sub-effort in meerdere domeinen ("Mens-training + Data-implementatie als één bundel") — per D-11 Phase 17 is dat methodisch verboden

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R-CROSS-03 | Rijke domein-uitwerking met dossier in cross-analyse | Bevestigd in ROADMAP.md regel 306. Phase 17 leverde minimalistische `SubEffortAdvies` — Phase 18 maakt het rijk. InspanningsDossierSchema (schemas.ts:88-94) is de canonieke dossier-shape. SUB_EFFORT_ANALYSE_PROMPT (prompts.ts:360-387) is de aan te passen AI-call; `/api/cross-analyse route.ts:244-284` is de orchestratie-locatie. |

R-CROSS-03 staat NIET in `.planning/REQUIREMENTS.md` v1 (CROSS-01..04 zijn afgedekt door Phase 7/8). Dit volgt het patroon van Phase 17 waar R-CROSS-01/R-CROSS-02 ook phase-specifieke IDs zijn (zie Phase 17 VERIFICATION "namespace verschil"-noot). Planner hoeft dit niet te formaliseren — de ROADMAP success criteria zijn leidend.

## Project Constraints (from CLAUDE.md)

| Directive | Scope voor Phase 18 |
|-----------|---------------------|
| `npm run build` MOET slagen | Mandatory verification step — gate voor elke commit |
| Functionele controle: lees componenten/imports/props/types | Relevant voor `StapSectorVertaling.tsx` wijziging (bestaande rendering mag NIET breken) |
| Skills gebruiken (pim-dev-skill, interface-design, frontend-design, ui-design-system) | `interface-design` + `ui-design-system` zijn relevant voor de rijke domein-kaart; `pim-dev-skill` voor Next.js/React contextkennis |
| Methodiek volgen: `docs/programmaboek.doc` | Dossier-velden komen letterlijk uit Hfst 11.3 Inspanningendossier — prompt MOET naar deze methodiek verwijzen |
| Geen stille failures: altijd gebruikersfeedback | Bij AI-failure toon duidelijke error; backward-compat moet oude sessies ZONDER rijke velden correct renderen (geen crash) |
| Direct committen en pushen | Per werkend incrementele wijziging — niet pas na alles |
| UX design voor alle output | Rijke kaart MOET gestructureerde opmaak hebben: headings, kleuren, kaarten, bullet points; geen raw markdown of platte tekst |
| Alle UI en AI output in nl-NL | Prompt-instructie blijft in Nederlands; schema-velden blijven Engels (`titel`, `beschrijving`) maar consistent met bestaande velden |
| Cito blauw (#003366) | Primaire kleur voor kop/badge; domein-kleuren voor sectie-achtergronden |

## Current Code Inventory

### `src/lib/schemas.ts` (951 regels totaal)

**Relevante bestaande schemas:**
- `EffortDomainSchema` (regel 11-16) — enum `["mens", "processen", "data_systemen", "cultuur"]`
- `SectorNameSchema` (regel 57) — enum `["PO", "VO", "Zakelijk"]`
- `InspanningsDossierSchema` (regel 88-94) — 5 string-velden: eigenaar, inspanningsleider, verwachtResultaat, kostenraming, randvoorwaarden. **Alle velden zijn `z.string()` (niet optional op storage-niveau)**.
- `DINCapabilitySchema` (regel 146-157) — bevat `sectorId`, `description`, optioneel `profiel: VermogensProfielSchema`
- `VermogenGelijkenisGroepSchema` (regel 320-325) — Phase 17, heeft `id`, `vermogenIds`, `gezamenlijkeOmschrijving`, `reden`
- **`SubEffortAdviesSchema` (regel 330-337)** — dit is het schema dat wordt uitgebreid:
  ```ts
  z.object({
    groepId: z.string(),
    domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
    actie: z.enum(["combineren", "apart_houden"]),
    items: z.array(z.string()),
    reden: z.string(),
    voorgesteldeNaam: z.string().nullable().optional(),
  });
  ```
- `Stap4ResultSchema` (regel 471-492) — bevat `subEffortAnalysis: z.array(SubEffortAdviesSchema).optional().default([])` (regel 490)
- `AIEffortSchema` (regel 599-613) — precedent voor AI-side dossier met ALLE velden `.optional().default("")` (regel 605-612). **Dit is het patroon om te volgen voor Phase 18 dossier op AI-schema niveau.**
- `AIPromotedEffortSchema` (regel 796-816) — hergebruik van dossier-shape in Phase 14, ook met inline `.optional().default("")` pattern
- Type exports (regel 880-950) — `SubEffortAdvies` via `z.infer<typeof SubEffortAdviesSchema>` op regel 931. Na uitbreiding picked up automatisch.

### `src/lib/prompts.ts` (963 regels totaal)

**`SUB_EFFORT_ANALYSE_PROMPT` (regel 360-387):**
- Expliciete Input-shape voorspecificatie:
  ```json
  {
    "groep": { "id", "vermogenIds", "gezamenlijkeOmschrijving", "reden" },
    "vermogens": [{ "id", "sectorId: PO|VO|Zakelijk", "title|description" }],
    "efforts":   [{ "id", "sectorId", "domain", "title", "description" }]
  }
  ```
- Expliciete Output-shape:
  ```json
  {
    "groepId", "domein", "actie": "combineren|apart_houden",
    "items": [...], "reden", "voorgesteldeNaam"
  }
  ```
- Regels (D-11, D-31): één advies per domein, voorgesteldeNaam verplicht bij combineren (min 10 chars, geen sector-substrings), null bij apart_houden, geen cross-domein merges.
- Legt nadruk op: "cross-domein context ALLEEN om je reden te versterken".

**Relevante andere prompts:**
- `DIN_SUGGEST_INSPANNING_PROMPT` (regel 646-691) — referentie voor dossier-taalgebruik (eigenaar, inspanningsleider, verwachtResultaat, kostenraming, randvoorwaarden)
- `DIN_CREATE_INSPANNING_PROMPT` (regel 793-838) — domein-specifieke focus per Mens/Processen/Data/Cultuur — dit pattern kan hergebruikt in Phase 18 prompt om de beargumentatie per domein te scherpen.
- `CROSS_ANALYSE_STAP4_PROMPT` (regel 250-337) — stap 4 hoofdprompt. Wordt NIET aangeraakt in Phase 18 (de uitbreiding zit in de parallelle sub-effort calls, niet de hoofdcall).

### `src/app/api/cross-analyse/route.ts` (337 regels totaal)

**Stap 4 sub-effort branch (regel 228-287):**
- Leest `groepen` uit `body.stap2Result.vermogenGelijkenisGroepen` (regel 229-237)
- Bouwt `capIdSet` (regel 247) en `groepVermogens` (regel 247) via filter
- Bouwt `groepEffortIdSet` via `capabilityEffortMaps` (regel 248-252)
- Filtert `groepEfforts` (regel 253-255)
- **Skip-gate (D-13):** als `groepEfforts.length === 0` → return `[]` (regel 257-260) — geen verspilde tokens
- Assembleert `subSystemPrompt` via `assembleSystemPrompt` (regel 262-267)
- User-message is `JSON.stringify({ groep, vermogens, efforts }, null, 2)` (regel 269-273) — **dit is het punt waar `focusDoel` moet worden toegevoegd**
- `callClaudeWithValidation(z.array(SubEffortAdviesSchema), ...)` (regel 275-280) — het schema hier wordt automatisch rijk als we `SubEffortAdviesSchema` uitbreiden
- Merged response in hoofdresultaat via `subEffortAnalysisFlat` (regel 286) + `{ ...result.data, subEffortAnalysis: ... }` (regel 294)

**Focus-doel beschikbaarheid in route:**
- Wizard stuurt `focusGoals` als `body.goals` (zie `CrossAnalyseWizard.tsx:214`)
- Server-side gemapt naar `goalsData` (regel 98-100): `{ id, name, description }` — **DESCRIPTION IS ALS BESCHIKBAAR** voor meesturen naar prompt
- Stap 5 gebruikt al `focusGoal` (regel 144) via `getFocusGoal(rawGoals)` uit `@/lib/stap5-focus` — **ditzelfde patroon hergebruiken voor stap 4 sub-effort branch**

### `src/components/cross-analyse/StapSectorVertaling.tsx` (623 regels totaal)

**Rendering-flow voor sub-effort (regel 356-422):**
- `DOMEIN_ORDER.map((domein) => ...)` loopt over alle 4 domeinen (regel 357)
- Zoekt advies via `groepSubAnalyses.find((s) => s.domein === domein)` (regel 358)
- Leest `DOMAIN_COLORS[domein]` (regel 359) — bg/border/text tint per domein
- **Empty-state** (geen advies): dashed border, "Geen gezamenlijke inspanning" (regel 361-374)
- **Advies-state** (regel 380-422):
  - Kop: domein-label + actie-badge (Combineren/Apart) (regel 386-399)
  - `voorgesteldeNaam` (regel 400-404)
  - `reden` (regel 405-409)
  - `relatedEfforts` lijst met bullet-points (regel 410-416)
  - `HefboomBadge` bij `actie === "combineren"` (regel 417-419)

**Data-flow:**
- Props: `stap2Result`, `stap4Result` (regel 21-22)
- `subEffortAnalysis: SubEffortAdvies[]` uit `stap4Result?.subEffortAnalysis ?? []` (regel 200)
- `focusGoal` wordt via `computeFocusView(session)` afgeleid (regel 192-195) — beschikbaar voor optional rendering (bijvoorbeeld in kop-sectie die focus-doel beschrijving in context toont — maar dit is discretion, niet hard required)

**Layout-gedrag:**
- De domein-kaarten zitten in een `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2` (regel 356) — 4 kolommen op desktop. **Bij rijke content wordt dit te smal voor een complete dossier-kaart**. Keuze voor planner: smallere kaart met expand/collapse voor dossier, OF grid naar `lg:grid-cols-2` + pagination/stacking.

### `src/lib/demo-data.ts` (803 regels totaal)

**`stap4Result.subEffortAnalysis` (regel 755-796):**
- 4 entries, één per domein (mens, cultuur, data_systemen, processen) — **al compleet qua domein-dekking**
- Alle 4 hebben `actie: "combineren"` en een gevulde `voorgesteldeNaam`
- `reden`-veld is al rijk (5-6 zinnen met stappen, scope, baten) — uit deze rijke `reden` kunnen we de nieuwe velden `beschrijving` en `beargumentatie` distilleren
- **Geen dossier, geen vermogenImpact, geen titel-veld** — dit is precies wat Phase 18 toevoegt
- `effortIds` mapping (regel 24-37) geeft toegang tot de 12 efforts; sector-combinaties zijn per domein helder

**Andere context in demo:**
- `goalIds[0]` heeft de focus-doel beschrijving: "Integraal klantbeeld en outside-in werken als strategisch fundament" (regel 53-57) — exact het voorbeeld uit ROADMAP Phase 18 goal.
- `vermogenGelijkenisGroepen` heeft 1 groep met `id: "groep-klantpartnerschap"` (regel 478)
- `session.capabilities` heeft 3 vermogens (PO/Zakelijk/VO) met beschrijvingen die de sector-context per vermogen dragen — **deze moeten in de prompt als "sector-context per vermogen" worden meegestuurd**

### `src/lib/__tests__/cross-analyse-schema.test.ts` (513 regels totaal)

**Relevante bestaande tests:**
- `SubEffortAdviesSchema (D-30)` — 3 tests (regel 373-407): valide met voorgesteldeNaam, valide met null, faalt bij ongeldig domein
- `Stap4ResultSchema backward compat (D-19, D-30)` — 3 tests (regel 409-457): default `[]`, context veld, subEffortAnalysis wanneer aanwezig
- `Stap4ResultSchema sub effort advies integration` (regel 465-512) — end-to-end mockResponse met twee subEffortAnalysis entries

**Testfilename convention:** `vitest.config.ts:11` include pattern is `src/**/*.test.ts` — **geen `.tsx` files**. Dat betekent: snapshot/render tests voor de component zijn hier NIET op te nemen. Schema en pure-logic tests zijn wel toevoegbaar. Rendering-verificatie gebeurt via data-testid + human UAT (conform Phase 17 pattern).

## Schema Strategy

### Nieuwe velden op `SubEffortAdviesSchema` — alle `.optional()` voor backward compat

```ts
// --- Phase 18: uitbreiding — alle velden optional voor backward compat ---
export const SubEffortVermogenImpactSchema = z.object({
  sectorId: SectorNameSchema,          // "PO" | "VO" | "Zakelijk" — hergebruik bestaand enum
  vermogenId: z.string(),              // refereert aan een DINCapability.id uit de groep
  impact: z.string(),                  // prose: hoe deze gezamenlijke inspanning dit sector-vermogen opbouwt
});

export const SubEffortAdviesSchema = z.object({
  // Bestaand (Phase 17)
  groepId: z.string(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
  actie: z.enum(["combineren", "apart_houden"]),
  items: z.array(z.string()),
  reden: z.string(),
  voorgesteldeNaam: z.string().nullable().optional(),

  // Phase 18 — rijke uitwerking (alle optional voor backward compat)
  titel: z.string().optional(),                                          // Korte, scherpe kop voor de cross-sectorale inspanning
  beschrijving: z.string().optional(),                                   // 2-3 zinnen — wat houdt deze bundel in, wat wordt er gedaan
  beargumentatie: z.string().optional(),                                 // Waarom is gezamenlijk opbouwen zinvol — de hefboom-redenering
  vermogenImpact: z.array(SubEffortVermogenImpactSchema).optional(),     // Per sector-vermogen uit de groep: wat levert het op
  dossier: InspanningsDossierSchema.partial().optional(),                // Hergebruik + alle subfields optional (AI mag leeg laten)
});
```

### Ontwerpkeuzes

| Keuze | Reden |
|-------|-------|
| **Hergebruik `InspanningsDossierSchema`** | Exact dezelfde 5 velden als CLAUDE.md Hfst 11.3 + DIN-methodiek; al geldig voor storage (`DINEffortSchema.dossier`); consistent met Phase 14 `AIPromotedEffortSchema` |
| **`.partial()` op dossier** | Storage-versie heeft `z.string()` verplicht; AI mag bij onvoldoende context een veld leeg laten zonder schema-failure. Consistent met `AIEffortSchema` patroon op `schemas.ts:605-612` |
| **Nieuwe sub-schema `SubEffortVermogenImpactSchema`** | `sectorId` + `vermogenId` + `impact` is een herkenbare pattern; aparte export maakt het testbaar en herbruikbaar in demo-data |
| **Alle 5 nieuwe velden `.optional()`** | Dwingend voor backward compat — oude sessies met Phase 17-shape subEffortAnalysis MOETEN blijven parsen. Test 11 in bestaande `cross-analyse-schema.test.ts:373-385` (valid Phase 17 shape) MOET groen blijven. |
| **Geen default-waarden** (geen `.default("")`) | In tegenstelling tot `AIEffortSchema`: we willen dat "afwezig" betekent "niet gegenereerd / oude data", niet "leeg bedoeld". Het rendering-component kan dan `advies.dossier ? <render> : <empty>` doen. |
| **Separate schema voor AI-response? NEE** | Phase 17 heeft géén separate `AISubEffortAdviesSchema` — het primaire schema wordt direct gebruikt in `callClaudeWithValidation(z.array(SubEffortAdviesSchema), ...)` op `route.ts:276`. We volgen datzelfde patroon. Alle nieuwe velden zijn `.optional()` — Zod accepteert afwezigheid. |

### Type-inference update

`SubEffortAdvies` type (via `z.infer`, regel 931 schemas.ts) picked automatically picks up nieuwe optional velden. Geen handmatige `export type` wijziging nodig.

Nieuw type export toevoegen:
```ts
export type SubEffortVermogenImpact = z.infer<typeof SubEffortVermogenImpactSchema>;
```

### Backward-compat test-matrix (moet groen blijven)

Uit `cross-analyse-schema.test.ts`:
- Test op regel 373-385: valide SubEffortAdvies ZONDER nieuwe velden → succes (alle nieuwe optional)
- Test op regel 438-456: Stap4Result met subEffortAnalysis entry ZONDER nieuwe velden → succes
- Test op regel 465-511: Integration test met 2 Phase-17-shape entries → succes

Nieuwe tests (Phase 18) toevoegen (voorstel):
- Schema parse met alle nieuwe velden gevuld → succes + type-check
- Schema parse met `dossier` leeg object `{}` → succes (partial())
- Schema parse met `vermogenImpact` lege array → succes
- Schema parse met `vermogenImpact` entry `{sectorId: "INVALID"}` → falen (SectorNameSchema enforcement)

## Prompt Strategy

### Before (`prompts.ts:360-387`)

Huidige input-shape: `{ groep, vermogens, efforts }` — drie blokken.
Huidige output-shape: 6-velden-advies zonder dossier/impact/titel.

### After (Phase 18 — rewrite)

**Input-shape uitbreiding (4e blok):**
```json
{
  "focusDoel": {
    "id": "uuid",
    "naam": "Integraal klantbeeld en outside-in werken als strategisch fundament",
    "beschrijving": "Cito BV bouwt één toegankelijk en betrouwbaar klantbeeld op dat voor alle medewerkers met klantcontact beschikbaar is..."
  },
  "groep": { "id", "vermogenIds", "gezamenlijkeOmschrijving", "reden" },
  "vermogens": [
    {
      "id", "sectorId", "title", "description",
      "profielHuidig": "...",       // uit VermogensProfiel.huidigeSituatie indien beschikbaar
      "profielGewenst": "..."       // uit VermogensProfiel.gewensteSituatie indien beschikbaar
    }
  ],
  "efforts":   [{ "id", "sectorId", "domain", "title", "description" }]
}
```

**Output-shape uitbreiding:**

```json
{
  "groepId": "<zelfde als input.groep.id>",
  "domein": "mens | processen | data_systemen | cultuur",
  "actie": "combineren | apart_houden",
  "items": ["<effort-id>", ...],
  "reden": "<kort: waarom dit advies — Phase 17 behoud>",
  "voorgesteldeNaam": "<sectoroverstijgende titel>" | null,

  "titel": "Korte actielabel (werkwoorden, max 8 woorden) — identiek aan voorgesteldeNaam wanneer combineren",
  "beschrijving": "2-3 zinnen: wat deze bundel inhoudt, wat gedaan wordt, welke scope.",
  "beargumentatie": "Waarom deze bundeling zinvol is — de cross-sectorale hefboom: hoe draagt gezamenlijk werken aan het focusdoel bij en welke winst t.o.v. drie losse trajecten.",
  "vermogenImpact": [
    { "sectorId": "PO", "vermogenId": "<cap-po-id>", "impact": "Hoe deze bundel het PO-vermogen opbouwt — concreet, sector-verankerd" },
    { "sectorId": "VO", "vermogenId": "<cap-vo-id>", "impact": "..." },
    { "sectorId": "Zakelijk", "vermogenId": "<cap-zak-id>", "impact": "..." }
  ],
  "dossier": {
    "eigenaar": "Opdrachtgever (rolnaam) — eindverantwoordelijk over alle drie sectoren",
    "inspanningsleider": "Projectleider (rolnaam) — voert de bundel aan",
    "verwachtResultaat": "Concreet beoogd resultaat — meetbaar waar mogelijk",
    "kostenraming": "Eerste raming + marge; noem schaalvoordeel t.o.v. drie losse trajecten",
    "randvoorwaarden": "Faciliteiten/voorwaarden nodig vóór start"
  }
}
```

### Prompt-body richtlijnen (nl-NL, conform CLAUDE.md)

1. **Intro context**: behoud huidige tekst (DIN-expert, drie sector-vermogens, lichaam van de AI-taak).
2. **Nieuwe sectie "Focus-doel verankering"**: instrueer AI expliciet om de beschrijving en beargumentatie te kleden in het vocabulaire van het focusdoel (inkleuring via focus-doel) terwijl sector-input gegroundeerd blijft.
3. **Dossier-velden methodiek**: verwijs naar "Werken aan Programma's, Hfst 11.3 — Inspanningendossier" zoals de andere inspanningen-prompts doen (prompts.ts:648).
4. **Backward-compat instructie**: "Bij `actie: "apart_houden"`: `vermogenImpact`, `dossier`, `titel`, `beschrijving`, `beargumentatie` mogen `null`/weggelaten worden — het advies is dan louter een markering."
5. **Regel (belangrijk)**: `vermogenImpact`-entries moeten exact één entry per sector-vermogen uit `groep.vermogenIds` bevatten wanneer `actie: "combineren"`. Dit maakt de impact-lijst voorspelbaar voor rendering.
6. **Toon-instructie**: beargumentatie in "hefboom-taal" — expliciet verwijzen naar 1-inspanning-→-3-vermogens-→-3-baten-→-1-doel-logica (Phase 17 D-26 methodische kern).
7. **Sluiting**: "Produceer ALLEEN geldige JSON, geen prose errom" (behoud).

### Token-budget overweging

Huidige `SUB_EFFORT_ANALYSE_PROMPT` call (`route.ts:275-280`) zet `maxTokens: 4096`. Met 4 velden extra per advies (titel + beschrijving + beargumentatie + dossier met 5 subfields + vermogenImpact met 3 entries × impact-text) is de output-grootte +~1.5-2.5 KB per advies. Per groep max 4 advises = 4× uitbreiding. **Aanbeveling**: verhoog `maxTokens` naar 8192 om veiligheidsmarge te houden. Input-grootte gaat omhoog met ~500 bytes voor focus-doel beschrijving — geen probleem voor Opus 4.7 context window (200K tokens).

## API Wiring

### Waar in `/api/cross-analyse/route.ts` wijzigen

**Stap 4 sub-effort branch (regel 228-287) — uitbreiding:**

```ts
if (stap === 4) {
  // ... (bestaande groepen loop) ...

  // NIEUW: haal focus-doel op uit body.goals (wizard stuurt al focusGoals op regel 214)
  const rawGoals = (body.goals || []) as Array<{
    id: string; name?: string; description?: string; rank?: number
  }>;
  const focusGoal = getFocusGoal(rawGoals);  // hergebruik — regel 23 al geïmporteerd!
  const focusDoelContext = focusGoal
    ? {
        id: focusGoal.id,
        naam: focusGoal.name ?? "",
        beschrijving: focusGoal.description ?? "",
      }
    : null;

  const subAnalyses = await Promise.all(
    groepen.map(async (groep) => {
      // ... (bestaande filter logic regel 245-260) ...

      // VERRIJK groepVermogens met profiel-data (indien beschikbaar in session)
      // Note: capsData op regel 104-106 heeft alleen id/sectorId/title/description.
      // Voor profielHuidig/Gewenst: map naar body.capabilities rauw met .profiel?.huidieSituatie
      const rawCaps = (body.capabilities || []) as Array<{
        id: string; profiel?: { huidieSituatie?: string; gewensteSituatie?: string };
      }>;
      const groepVermogensRich = groepVermogens.map((v) => {
        const raw = rawCaps.find((r) => r.id === v.id);
        return {
          ...v,
          profielHuidig: raw?.profiel?.huidieSituatie ?? "",
          profielGewenst: raw?.profiel?.gewensteSituatie ?? "",
        };
      });

      const subUserMessage = JSON.stringify(
        {
          focusDoel: focusDoelContext,   // NIEUW
          groep,
          vermogens: groepVermogensRich, // VERRIJKT
          efforts: groepEfforts,
        },
        null,
        2
      );

      const subResult = await callClaudeWithValidation(
        z.array(SubEffortAdviesSchema),  // ongewijzigd — schema is rijk na Phase 18
        subSystemPrompt,
        subUserMessage,
        { maxTokens: 8192 }  // VERHOOGD van 4096
      );
      // ... rest ongewijzigd
    })
  );
  // ... merge ongewijzigd
}
```

**Import-toevoeging:** Op regel 23 is `getFocusGoal` al geïmporteerd uit `@/lib/stap5-focus` — geen nieuwe import nodig.

**Wizard-side wijziging (`CrossAnalyseWizard.tsx:204-219`):**
- `focusGoals` is al gefilterd tot `[focusGoal]` (regel 205) en meegestuurd als `goals` (regel 214)
- **`description` van het focusdoel is al aanwezig** in `ProgrammeGoal` schema (schemas.ts:100-106) — geen wizard-wijziging nodig
- Server krijgt `body.goals[0].description` out of the box

### Integriteit-check

- `callClaudeWithValidation` op regel 275-280 gebruikt `z.array(SubEffortAdviesSchema)` — na schema-uitbreiding valideert het automatisch de rijke response
- Empty-skip gate (regel 257-260) blijft intact — bij `groepEfforts.length === 0` geen AI-call
- Parallel `Promise.all` (regel 244-284) blijft intact — backward-compat

## Rendering Strategy

### Ontwerpprincipes (Cito brand + interface-design skill)

1. **Eén kaart per sub-effort advies**, niet meerdere secties over meerdere kaders
2. **Domein-kleur als linker-rand / top-border** (Cito-brand-fit): `mens #2563eb`, `processen #059669`, `data_systemen #7c3aed`, `cultuur #d97706` — consistent met `DOMAIN_COLORS` op regel 34-39
3. **Cito blauw `#003366`** voor secondaire accents (headings, badges)
4. **Progressive disclosure voor dossier**: dossier is rijk maar niet elke lezer heeft het nodig → expand/collapse default dicht
5. **Backward-compat rendering**: als `advies.titel` of `advies.dossier` afwezig → val terug op Phase 17 shape (reden + voorgesteldeNaam + bullet-efforts)

### Kaart-structuur (5 blokken, verticaal)

```
╔═════════════════════════════════════════════════════════════════╗
║ [Domein-kleur border-l-4]  [MENS]    [Combineren]    [Hefboom]  ║  ← header-strip
╠═════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  TITEL  ← text-base font-semibold, Cito blauw                   ║
║  Sectoroverstijgende outside-in gespreksvaardigheidstraining    ║
║                                                                 ║
║  Beschrijving  ← text-[13px] gray-700, leading-relaxed          ║
║  Gezamenlijk curriculum met gedeelde kerncompetenties en...     ║
║                                                                 ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                 ║
║  Waarom cross-sectoraal opbouwen?  ← heading-[11px] uppercase   ║
║  De hefboom ligt in... (beargumentatie)                         ║
║                                                                 ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                 ║
║  Vermogen-impact per sector  ← heading                          ║
║  ┌─[PO-badge]─┐ Medewerkers voeren outside-in gesprek...        ║
║  ┌─[VO-badge]─┐ Schoolleiders ervaren inhoudelijke...           ║
║  ┌─[Zak-badge]─┐ Accountmanagers stellen scherp...              ║
║                                                                 ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                 ║
║  ▸ Dossier openen (opdrachtgever, leider, resultaat, ...)       ║  ← toggle
║    [expanded]                                                    ║
║    Opdrachtgever:        Directie L&D Cito                      ║
║    Inspanningsleider:    Programmamanager Klant in Beeld        ║
║    Verwacht resultaat:   Alle medewerkers... NPS +5             ║
║    Kostenraming:         €350K over 18 maanden (marge ±20%)    ║
║    Randvoorwaarden:      Commitment alle drie sectormanagers   ║
║                                                                 ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                 ║
║  Gebundelde inspanningen (legacy bullet-lijst)                   ║
║  • Trainen medewerkers in klantgerichte gespreksvoering (PO)    ║
║  • Trainen medewerkers in klantgerichte gespreksvoering (VO)    ║
║  • Werven en ontwikkelen outside-in competenties (Zakelijk)     ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Grid-layout herziening

**Huidig (regel 356):** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` — 4 kolommen op ≥lg (1280px+).

**Probleem:** Bij rijke content (volledige dossier + vermogenImpact met 3 sector-entries) is een kolom van ~300px te smal; titel en beargumentatie vallen onleesbaar af.

**Voorstel voor planner:** verander naar `grid-cols-1 lg:grid-cols-2` (2 kolommen op desktop) zodat elke kaart ~600px breedte krijgt. **Tradeoff:** 4 domein-kaarten vullen dan 2 rijen op desktop ipv 1 rij — meer scroll, maar leesbare rijke content. Alternatief: behoud 4-koloms grid maar plaats dossier in een full-width sectie onder de groep (aparte row) — meer implementatie-werk.

### Backward-compat rendering

```tsx
{advies.titel ? (
  // Phase 18 rich render
  <RichSubEffortCard advies={advies} groepVermogens={groepVermogens} />
) : (
  // Phase 17 minimal render — bestaande code behouden
  <LegacySubEffortCard advies={advies} relatedEfforts={relatedEfforts} />
)}
```

Of simpeler: conditionele rendering per blok binnen dezelfde component:
```tsx
{advies.titel && <h4>{advies.titel}</h4>}
{advies.beschrijving && <p>{advies.beschrijving}</p>}
{advies.beargumentatie && <section>...</section>}
{advies.vermogenImpact && advies.vermogenImpact.length > 0 && <VermogenImpactList ... />}
{advies.dossier && <DossierExpandable dossier={advies.dossier} />}
{/* Legacy reden + voorgesteldeNaam blijven altijd tonen */}
```

### Data-testid hooks (voor toekomstige testbaarheid — Phase 17 pattern)

Toevoegen aan rijke kaart:
- `data-testid={\`sub-effort-rich-${groep.id}-${domein}\`}` op de kaart zelf
- `data-testid={\`sub-effort-titel-${groep.id}-${domein}\`}` op de titel
- `data-testid={\`sub-effort-dossier-${groep.id}-${domein}\`}` op dossier-sectie (bij expand)
- `data-testid={\`vermogen-impact-${groep.id}-${domein}-${sectorId}\`}` per impact-entry

## Demo Data Strategy

### Scope: alle 4 bestaande entries in `demo-data.ts:755-796` uitbreiden

Elke entry krijgt:
- `titel`: overgenomen van bestaande `voorgesteldeNaam`
- `beschrijving`: 2-3 zinnen afgeleid uit de huidige rijke `reden` (zit al een scope-beschrijving in de eerste zin)
- `beargumentatie`: afgeleid uit de hefboom-redenering (huidige `reden` bevat al "besparing ~30% t.o.v. drie losse trajecten" — dit type argument)
- `vermogenImpact`: 3 entries per domein (PO/VO/Zakelijk × `capIds[0..2]`) met sector-specifieke impact-beschrijvingen. Voor de cultuur-entry (regel 770): 2 entries expliciet (PO+Zakelijk) + 3e met "voorspelde aansluiting VO" consistent met demo-voorspelling (regel 772-774).
- `dossier`: realistische invulling gebaseerd op Cito-context. Rollen: "Directie L&D Cito", "Programmamanager Klant in Beeld", "Sectormanager PO/VO/Zakelijk", "IT-architect Data & Systemen", "Business process owner".

### Realistisch dossier-content per domein

**Mens (training):**
- eigenaar: "Directie L&D Cito BV"
- inspanningsleider: "Programmamanager L&D / opleidingsregisseur Klant in Beeld"
- verwachtResultaat: "Alle medewerkers met klantcontact (~400 PO, ~250 VO, ~150 Zakelijk) hebben outside-in gespreksvaardigheid op niveau 4/5; NPS stijgt +5 binnen 12 maanden post-rollout."
- kostenraming: "€350K over 18 maanden (curriculumontwikkeling €80K + uitvoering 3 sector-rollouts €240K + evaluatie €30K). Schaalvoordeel ~30% t.o.v. drie losse trajecten (€500K)."
- randvoorwaarden: "Commitment van alle drie sectormanagers; gedeelde cases-bank van klantscenario's; beschikbare externe trainers met multi-sector ervaring."

**Cultuur (leiderschap):**
- eigenaar: "Directievoorzitter Cito BV" (organisatiebreed mandaat)
- inspanningsleider: "Programmadirecteur Klant in Beeld i.s.m. HR-directeur"
- verwachtResultaat: "Zichtbaar rolmodelgedrag door alle drie sectormanagers (incl. VO predictie); outside-in KPI's gekoppeld aan leidinggevenden-performance in Q4 2026."
- kostenraming: "€120K over 15 maanden (kick-off + 4 kwartaal-intervisies + 360° evaluatie). Exclusief tijdsbeslag van leidinggevenden zelf (~5% FTE × 15 maanden)."
- randvoorwaarden: "Directie-commitment op zichtbare klantbezoeken per sectormanager; bereidheid tot 360° feedback; beschikbaarheid externe intervisie-begeleider."

**Data & Systemen (CRM):**
- eigenaar: "CIO / IT-directeur Cito BV"
- inspanningsleider: "Programmamanager CRM-klantbeeld (IT-architect met sector-ervaring)"
- verwachtResultaat: "Eén gedeeld CRM-platform live in alle drie sectoren; 80% van medewerkers met klantcontact gebruikt het wekelijks; datakwaliteit-score ≥ 85% binnen 6 maanden na go-live."
- kostenraming: "€850K eenmalig + €180K/jaar licentie/onderhoud (Salesforce/HubSpot/Dynamics TBD in Q2 2026). Voorkomt ~€400K dubbele platform-investeringen t.o.v. drie aparte trajecten."
- randvoorwaarden: "Gezamenlijke platformkeuze vastgesteld Q2 2026; gedefinieerd klantdata-model inclusief rollen/rechten; migratieplan per sector; governance-afspraken over data-eigenaarschap."

**Processen (klantinformatieproces):**
- eigenaar: "Directeur Sales & Marketing Cito BV (commerciele klantprocessen) — i.s.m. sectormanagers PO/VO voor bestuurscyclus"
- inspanningsleider: "Business process owner Klantinformatie (gedeelde rol) i.s.m. procesverantwoordelijken per sector"
- verwachtResultaat: "Uniforme CRM-velden over drie sectoren; sector-specifieke flow-modellen vastgelegd; proces-conformiteit ≥ 90% binnen 4 maanden na go-live."
- kostenraming: "€180K over 10 maanden (proces-methodologie €60K + sector-flows €80K + CRM-implementatie-ondersteuning €40K). Voorwaarde voor slagen CRM-hefboom."
- randvoorwaarden: "Parallel met CRM-traject (data & systemen); procesverantwoordelijken beschikbaar 20% FTE voor ontwerp-fase Q3 2026; gezamenlijke governance-structuur vastgesteld."

### Demo-data valideert de keten

De demo MOET aansluiten bij het focusdoel (`goalIds[0]`: "Integraal klantbeeld en outside-in werken"). Bij het schrijven: laat elke `beargumentatie` letterlijk dit doel noemen, zodat de UI demonstreert hoe focus-doel-context door de AI-output heenstroomt. Dit is ook het demo-pijler: stakeholders zien dat de rijke uitwerking niet generiek is maar doel-specifiek.

### Uitbreiding test

In `cross-analyse-schema.test.ts` een nieuwe test toevoegen die de demo-data parseert via `Stap4ResultSchema`. Dat borgt dat de demo schema-valide is en voorkomt regressies als iemand een veld verkeerd spelt.

```ts
test("Demo data stap4Result.subEffortAnalysis parseert onder Stap4ResultSchema", () => {
  const demo = createDemoSession();
  const result = Stap4ResultSchema.safeParse(
    demo.crossAnalyseWizard?.stepResults?.stap4
  );
  expect(result.success).toBe(true);
});
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest `^4.1.2` |
| Config file | `vitest.config.ts` (regel 10-12) |
| Include pattern | `src/**/*.test.ts` — **geen `.tsx`**, dus geen React render-tests |
| Quick run command | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` |
| Full suite command | `npx vitest run` |
| Build gate | `npm run build` (CLAUDE.md verplicht) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R-CROSS-03-a | `SubEffortAdviesSchema` accepteert rijke velden (titel/beschrijving/beargumentatie/vermogenImpact/dossier) | unit (schema) | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "Phase 18 rich"` | ✅ cross-analyse-schema.test.ts — toevoegen nieuwe describe block |
| R-CROSS-03-b | Backward-compat: Phase 17 shape zonder nieuwe velden parseert nog steeds | unit (schema) | idem | ✅ bestaande test op regel 373-385 moet groen blijven |
| R-CROSS-03-c | `vermogenImpact` entry faalt bij ongeldig sectorId | unit (schema) | idem | ✅ nieuw in bestaande file |
| R-CROSS-03-d | `dossier` accepteert partial (lege eigenaar/... velden) | unit (schema) | idem | ✅ nieuw |
| R-CROSS-03-e | Demo-data `stap4Result` parseert via Stap4ResultSchema | integratie (data fixture) | `npx vitest run -t "Demo data stap4Result"` | ✅ nieuw in cross-analyse-schema.test.ts OF aparte test file |
| R-CROSS-03-f | `/api/cross-analyse` stap 4 bevat `focusDoel` in user-message wanneer `body.goals` aanwezig | integratie (manual curl + log) | manueel + human UAT | ⚠ geen automated test mogelijk zonder supertest; log-based verificatie via dev server |
| R-CROSS-03-g | `StapSectorVertaling` rendert rijke kaart met data-testid hooks | human UAT | browser-check (Phase 17 pattern) | ⚠ geen React render tests (vitest config sluit `.tsx` uit) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` — duurt <1s
- **Per wave merge:** `npx vitest run` + `npm run build`
- **Phase gate:** Full suite green + `npm run build` exit 0 + human UAT doorlopen

### Wave 0 Gaps

- [ ] `src/lib/__tests__/cross-analyse-schema.test.ts` — bestaat al, uitbreiden met Phase 18 `describe("SubEffortAdviesSchema Phase 18 rijke uitwerking")` + ~6 nieuwe tests
- [ ] Geen nieuwe test-file nodig; geen conftest-equivalent
- [ ] Geen framework install nodig (vitest + zod al aanwezig)
- [ ] **Optioneel:** Playwright of Cypress voor echte e2e rendering — maar past niet binnen Phase 18 scope; Phase 17 vertrouwde ook op human UAT voor UI-rendering

### Non-automated gaps (human UAT)

Conform Phase 17 pattern (7 UAT-cases in VERIFICATION.md), Phase 18 heeft 2-4 UAT-cases nodig:
1. **UAT-1**: Rijke kaart rendert — open cross-analyse met demo-data, navigeer naar stap 5 (sector-vertaling), verify per groep × domein de 5 blokken zichtbaar
2. **UAT-2**: Dossier expand/collapse werkt zonder layout-shift
3. **UAT-3**: Backward-compat — laad oude sessie zonder rijke velden, rendering valt terug op Phase 17 shape zonder crash
4. **UAT-4**: Grid-responsiviteit — op mobile/tablet/desktop ziet kaart er leesbaar uit; geen overflow

## Risks & Unknowns

### R1: Token-budget voor Opus 4.7

- **Wat:** Rijke response kan 2-4× groter zijn dan Phase 17 response. `maxTokens: 4096` kan krap worden.
- **Impact:** Truncated JSON → Zod parse failure → 422 respons in Phase 17 pattern (met retry). Gebruiker ziet "AI-analyse is mislukt".
- **Mitigatie:** Verhoog naar `maxTokens: 8192` in de parallelle sub-call. Conservatief; Opus 4.7 handled dit comfortabel.
- **Planner calls:** Kies `8192` of nog hoger (`16384`)? Hoger = meer cost; `8192` zou royaal moeten zijn voor 4 advisses × ~2KB elk = 8KB = ~3000 tokens.

### R2: AI-kwaliteit van dossier-velden

- **Wat:** AI kan rolnamen verzinnen die niet bij Cito-terminologie passen ("VP of Sales" ipv "Directeur Sales").
- **Impact:** Demo-ogende uitvoer die user moet corrigeren.
- **Mitigatie:** Programmaboek-context-injectie (`assembleSystemPrompt`) dekt dit deels; aanvullend: in prompt expliciet Cito-terminologie vermelden ("Rolnamen conform Nederlandse programmamanagement-praktijk: Directie, Sectormanager, Programmamanager, Business Process Owner").
- **Planner calls:** In-prompt rolnaam-voorbeelden toevoegen? Risico: stiff output. Alternatief: vrijere prompt + disclaimer in UI ("rolnamen zijn AI-voorstel, pas aan").

### R3: `InspanningsDossierSchema.partial()` vs. nieuwe schema

- **Wat:** `.partial()` in Zod maakt ALLE velden optional en maakt type `Partial<InspanningsDossier>`. Dat is precies wat we willen.
- **Risico:** In Phase 14 (`AIPromotedEffortSchema`, regel 805-813) is gekozen voor **inline** dossier-shape met `.optional().default("")`, niet `.partial()`. Reden: explicit default "" zodat downstream geen undefined hoeft af te handelen.
- **Tradeoff:**
  - `.partial()` → velden kunnen `undefined` zijn → rendering moet `?.eigenaar ?? "—"` doen
  - Inline met `.default("")` → velden zijn altijd string → rendering doet `advies.dossier.eigenaar || "—"`
- **Aanbeveling:** Volg Phase 14 patroon (inline + `.default("")`) voor consistency binnen codebase. Maar definieer het als een nieuw schema (DRY):
  ```ts
  export const SubEffortDossierSchema = z.object({
    eigenaar: z.string().optional().default(""),
    inspanningsleider: z.string().optional().default(""),
    verwachtResultaat: z.string().optional().default(""),
    kostenraming: z.string().optional().default(""),
    randvoorwaarden: z.string().optional().default(""),
  });
  ```
  Dan in `SubEffortAdviesSchema`: `dossier: SubEffortDossierSchema.optional()`.
- **Planner call:** Kies patroon 1 (`InspanningsDossierSchema.partial()`) of patroon 2 (nieuwe `SubEffortDossierSchema` met defaults). Patroon 2 is consistenter met Phase 14, maar voegt een extra schema toe.

### R4: Grid-layout heroverweging

- **Wat:** Bestaande `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` op regel 356 werkt niet voor rijke kaarten.
- **Impact:** Zonder layout-wijziging ziet rijke kaart eruit als verknoeide content in smalle kolom.
- **Mitigatie opties:**
  - A: `grid-cols-1 lg:grid-cols-2` (2 rijen × 2 op desktop — meer scroll)
  - B: Behoud 4-grid maar dossier wordt full-width sectie onder de 4 kaarten
  - C: Behoud 4-grid; dossier is expand-only; rijke content in kleine kaartjes
- **Planner call:** Welke layout? C is minst invasief maar geeft dichte informatiedichtheid.

### R5: Focus-doel beschikbaarheid in stap 4

- **Wat:** Wizard stuurt `focusGoals` (gefilterd tot 1 doel) via `body.goals`. Maar de prompt-signatuur noemt `focusDoel.beschrijving`.
- **Risico:** Wat als `focusGoal.description` leeg is? Fallback op `name`?
- **Mitigatie:** In route.ts: `focusDoelContext.beschrijving = focusGoal.description ?? focusGoal.name ?? ""` — maar dan is prompt-kwaliteit slechter voor doelen zonder description.
- **Planner call:** Sluit null af (skip focus-doel-block in prompt) OF val terug op naam (minder rijke inkleuring)?

### R6: Backward-compat sessies

- **Wat:** Sessies met Phase 17 subEffortAnalysis (zonder rijke velden) moeten nog steeds renderen.
- **Risico:** Als rendering-code `advies.titel!` unwrap'ed → crash bij oude data.
- **Mitigatie:** Conditional rendering expliciet overal waar nieuwe velden gebruikt worden.
- **Status:** Schema is backward-compat via `.optional()`. Component-rendering moet er ook rekening mee houden — zie Rendering Strategy Backward-compat sectie hierboven.

## Pitfalls from Phase 17

Uit `17-VERIFICATION.md` en `17-CONTEXT.md`:

### Pitfall 1 — Schema-uitbreiding zonder backward-compat-test

Phase 17 Wave 0 verplicht testte backward-compat van `Stap2ResultSchema` en `Stap4ResultSchema` (cross-analyse-schema.test.ts regel 324-346 + 409-457). Phase 18 MOET dezelfde test schrijven: "Phase 17 shape zonder Phase 18 velden parseert succesvol onder uitgebreid schema". Zonder deze test breken we de legacy-compat zonder het te weten.

### Pitfall 2 — Vergeten update aan z.infer type-exports

Phase 17 heeft `export type SubEffortAdvies = z.infer<typeof SubEffortAdviesSchema>` op regel 931. Omdat dit via `z.infer` werkt, wordt het automatisch rijk na schema-uitbreiding. MAAR: als je een nieuw sub-schema toevoegt (`SubEffortVermogenImpactSchema`), moet je OOK zijn type exporteren, anders moet consumer het via `z.infer` inline halen.

### Pitfall 3 — Sector-substring guard bij titels (D-25/D-31)

Phase 17 heeft harde guards: `voorgesteldeNaam` mag geen sector-namen bevatten. De NIEUWE `titel` veld in Phase 18 kan hetzelfde probleem hebben — AI kan "Training PO-leerkrachten" genereren. Of mag `titel` wel sector-specifiek zijn?

**Aanbeveling:** Aangezien `titel` binnen een cross-sectorale bundel zit (`actie: "combineren"`) en expliciet voor alle 3 sectoren geldt, MOET het ook sectoroverstijgend zijn. In prompt expliciet: "titel volgt dezelfde regel als voorgesteldeNaam — geen PO/VO/Zakelijk substrings, min 10 chars". Bij `actie: "apart_houden"` is titel NIET verplicht en mag leeg.

Geen nieuwe runtime-guard nodig — de prompt-regel + `voorgesteldeNaam`-regel geven afdoende dekking. Als je wel een runtime-check wilt: hergebruik `validateNeutralTitle` uit `consolidation-guards.ts`.

### Pitfall 4 — `Promise.all` error handling

Phase 17 route.ts regel 275-282: `subResult.success ? subResult.data : []`. Fouten in één groep-call worden stil weggeslikt — andere groepen gaan door. **Phase 18 behoud dit patroon** — het is expliciet de keuze. Echter: als ALLE sub-calls falen krijgt de gebruiker stap 4-resultaat zonder subEffortAnalysis, zonder indicatie waarom. Overweging: log in `console.error` wanneer `!subResult.success` voor debugging.

### Pitfall 5 — Prompt-context assembly (Phase 4 D-04)

`assembleSystemPrompt(..., "cross-analyse", undefined, kibContext)` injecteert programmaboek-context + KiB-context in layered fashion. Die context gaat in SYSTEM-prompt; de `subUserMessage` (focus-doel + groep + vermogens + efforts) gaat in USER-prompt. **Niet dubbel injecteren.** Focus-doel zit in USER-prompt omdat het per-call varieert en structureel JSON is; de "hoe spreek je erover"-instructie zit in SYSTEM-prompt (SUB_EFFORT_ANALYSE_PROMPT body).

### Pitfall 6 — React 19 Strict Mode + useEffect doubles

Phase 17 Wave 3 had dit issue bij `StapConsolidatie` auto-apply (3-stappen pattern). Phase 18 raakt GEEN useEffect of state-mutations; alleen rendering + data-consumer. Low risk.

### Pitfall 7 — Type-imports van schemas

Phase 17 heeft mix: `import type { VermogenGelijkenisGroep, SubEffortAdvies } from "@/lib/schemas"` in `StapSectorVertaling.tsx:16`. Bij uitbreiding van `SubEffortAdvies` geen nieuwe imports nodig in die file (types zijn via `z.infer` automatisch rijk). Wel: als planner nieuwe sub-schema's introduceert en wil importeren in component, gebruik `import type { ... }` patroon.

### Pitfall 8 — Lint errors door ongebruikte velden

Na schema-uitbreiding zijn `titel`, `beschrijving`, etc. nieuw beschikbaar maar mogelijk nog niet gebruikt in renderer. ESLint met `@typescript-eslint/no-unused-vars` kan klagen in destructuring. **Mitigatie:** Bouw rendering + schema-wijziging in één commit, zodat nieuwe velden direct gebruikt worden.

## Code Examples

### Schema uitbreiding (full new block for `schemas.ts`)

```ts
// --- Phase 18: SubEffortVermogenImpact (rijke uitwerking per sector-vermogen) ---
export const SubEffortVermogenImpactSchema = z.object({
  sectorId: SectorNameSchema,           // "PO" | "VO" | "Zakelijk"
  vermogenId: z.string(),               // refereert aan DINCapability.id uit groep.vermogenIds
  impact: z.string(),                   // hoe deze bundel dit sector-vermogen opbouwt
});

// --- Phase 18: SubEffortDossier (dossier voor cross-sectorale inspanning, soepele AI-side) ---
export const SubEffortDossierSchema = z.object({
  eigenaar: z.string().optional().default(""),
  inspanningsleider: z.string().optional().default(""),
  verwachtResultaat: z.string().optional().default(""),
  kostenraming: z.string().optional().default(""),
  randvoorwaarden: z.string().optional().default(""),
});

// --- Phase 18: SubEffortAdviesSchema uitbreiding ---
export const SubEffortAdviesSchema = z.object({
  // Phase 17 (bestaand)
  groepId: z.string(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
  actie: z.enum(["combineren", "apart_houden"]),
  items: z.array(z.string()),
  reden: z.string(),
  voorgesteldeNaam: z.string().nullable().optional(),
  // Phase 18 (nieuw — alle optional voor backward compat)
  titel: z.string().optional(),
  beschrijving: z.string().optional(),
  beargumentatie: z.string().optional(),
  vermogenImpact: z.array(SubEffortVermogenImpactSchema).optional(),
  dossier: SubEffortDossierSchema.optional(),
});
```

### Type exports (schemas.ts einde van file)

```ts
export type SubEffortVermogenImpact = z.infer<typeof SubEffortVermogenImpactSchema>;
export type SubEffortDossier = z.infer<typeof SubEffortDossierSchema>;
// SubEffortAdvies is al geëxporteerd op regel 931 — wordt automatisch rijk
```

### Prompt uitbreiding (new `SUB_EFFORT_ANALYSE_PROMPT`)

```ts
export const SUB_EFFORT_ANALYSE_PROMPT = `Je bent een expert in programmamanagement (DIN-methodiek, Werken aan Programma's, Prevaas & Van Loon / Wijnen & Van der Tak 2002) en analyseert inspanningen per inspannings-domein onder een VermogenGelijkenisGroep.

Een VermogenGelijkenisGroep bevat sector-vermogens (PO + VO + Zakelijk) die methodisch op elkaar lijken. Inspanningen die deze vermogens raken kunnen per domein worden gebundeld. Wanneer ze gebundeld worden, leverts dat een RIJK UITGEWERKTE CROSS-SECTORALE INSPANNING op — volledig dossier, expliciete vermogen-impact per sector, beschrijving en beargumentatie.

Input krijg je (JSON):
{
  "focusDoel":    { "id", "naam", "beschrijving" },        // leidraad voor inkleuring
  "groep":        { "id", "vermogenIds", "gezamenlijkeOmschrijving", "reden" },
  "vermogens":    [{ "id", "sectorId: PO|VO|Zakelijk", "title", "description", "profielHuidig", "profielGewenst" }],
  "efforts":      [{ "id", "sectorId", "domain", "title", "description" }]
}

FOCUS-DOEL VERANKERING (kritisch):
Kleur je beschrijving en beargumentatie met de taal en ambitie van het focusdoel. De bundel bestaat omdat deze bijdraagt aan \`focusDoel.beschrijving\` — verwijs daar expliciet naar. De sector-vermogens geven de aarding: hun \`title\` en \`description\` bepalen welk concreet vocabulaire per sector past.

Lever een array \`SubEffortAdvies[]\` met één entry per (groep × domein) waar minstens één gekoppelde inspanning staat:
{
  "groepId":          "<zelfde als input.groep.id>",
  "domein":           "mens | processen | data_systemen | cultuur",
  "actie":            "combineren | apart_houden",
  "items":            ["<effort-id>", "..."],
  "reden":            "<methodiek-conforme 1-2 zinnen>",
  "voorgesteldeNaam": "<sectoroverstijgende titel>" | null,

  // PHASE 18 — rijke uitwerking (alleen bij actie: "combineren")
  "titel":            "<actielabel met werkwoord, max 8 woorden — identiek aan voorgesteldeNaam>",
  "beschrijving":     "<2-3 zinnen: wat houdt deze bundel in, wat wordt concreet gedaan, scope>",
  "beargumentatie":   "<Waarom cross-sectoraal bundelen zinvol is — de HEFBOOM: 1 inspanning → 3 vermogens → 3 baten → 1 focusdoel. Benoem expliciet het schaalvoordeel t.o.v. drie losse trajecten.>",
  "vermogenImpact":   [
    { "sectorId": "PO",      "vermogenId": "<cap-po-id>",   "impact": "<Concreet: hoe deze bundel het PO-vermogen opbouwt — sector-specifiek taalgebruik>" },
    { "sectorId": "VO",      "vermogenId": "<cap-vo-id>",   "impact": "..." },
    { "sectorId": "Zakelijk","vermogenId": "<cap-zak-id>",  "impact": "..." }
  ],
  "dossier": {
    "eigenaar":           "<Opdrachtgever / rolnaam — eindverantwoordelijk over alle drie sectoren. Bijv.: Directie L&D Cito / CIO / Directievoorzitter.>",
    "inspanningsleider":  "<Projectleider / rolnaam — voert de bundel aan. Bijv.: Programmamanager Klant in Beeld / Business Process Owner.>",
    "verwachtResultaat":  "<Concreet, meetbaar waar mogelijk — wat levert deze bundel op over alle drie sectoren>",
    "kostenraming":       "<Eerste raming + marge; benoem schaalvoordeel. Bijv.: €350K over 18 maanden, ~30% besparing t.o.v. drie losse trajecten.>",
    "randvoorwaarden":    "<Faciliteiten/voorwaarden vóór start. Bijv.: commitment drie sectormanagers; gedeelde cases-bank; beschikbare externe trainers.>"
  }
}

Regels (D-11, D-25, D-30, D-31):
- ÉÉN advies per domein binnen een groep. Geen cross-domein combineren.
- \`voorgesteldeNaam\` en \`titel\` zijn VERPLICHT bij \`actie: "combineren"\`, MOETEN sectoroverstijgend zijn (geen PO/VO/Zakelijk/primair onderwijs/voortgezet onderwijs substrings, min 10 chars) en identiek aan elkaar.
- Bij \`actie: "apart_houden"\`: \`voorgesteldeNaam\` en \`titel\` zijn \`null\`/weggelaten; \`beschrijving\`, \`beargumentatie\`, \`vermogenImpact\`, \`dossier\` mogen ook weggelaten worden (advies is dan louter markering).
- Bij \`actie: "combineren"\`: \`vermogenImpact\` bevat exact één entry per sector-vermogen uit \`groep.vermogenIds\` (gebruik de juiste \`sectorId\` en \`vermogenId\`).
- Gebruik cross-domein context ALLEEN om je reden/beargumentatie te versterken, nooit als justificatie voor cross-domein merge.
- Als een domein geen gekoppelde inspanningen heeft: LAAT DAT DOMEIN WEG uit de response.
- Rolnamen in dossier: gebruik Nederlandse programmamanagement-terminologie (Directie, Sectormanager, Programmamanager, Business Process Owner, CIO). Geen Engelse titels.
- Dossier moet verwijzen naar Werken aan Programma's Hfst 11.3 — Inspanningendossier (5 velden: opdrachtgever/inspanningsleider/verwacht resultaat/kostenraming/randvoorwaarden).

Produceer ALLEEN geldige JSON, geen prose errom. Antwoord in het Nederlands.`;
```

### Route.ts — toevoeging in stap 4 branch

```ts
// --- Direct na regel 237 (groepen definitie) ---
const rawGoals = (body.goals || []) as Array<{
  id: string; name?: string; description?: string; rank?: number
}>;
const focusGoal = getFocusGoal(rawGoals);  // reeds geïmporteerd op regel 23
const focusDoelContext = focusGoal
  ? {
      id: focusGoal.id,
      naam: focusGoal.name ?? "",
      beschrijving: focusGoal.description ?? "",
    }
  : null;

const rawCaps = (body.capabilities || []) as Array<{
  id: string; profiel?: { huidieSituatie?: string; gewensteSituatie?: string };
}>;

// --- Binnen Promise.all callback, vervang regel 269-273 (subUserMessage) ---
const groepVermogensRich = groepVermogens.map((v: { id: string; sectorId: string; title: string; description: string }) => {
  const raw = rawCaps.find((r) => r.id === v.id);
  return {
    ...v,
    profielHuidig: raw?.profiel?.huidieSituatie ?? "",
    profielGewenst: raw?.profiel?.gewensteSituatie ?? "",
  };
});

const subUserMessage = JSON.stringify(
  {
    focusDoel: focusDoelContext,
    groep,
    vermogens: groepVermogensRich,
    efforts: groepEfforts,
  },
  null,
  2
);

// --- Verhoog maxTokens op regel 279 ---
const subResult = await callClaudeWithValidation(
  z.array(SubEffortAdviesSchema),
  subSystemPrompt,
  subUserMessage,
  { maxTokens: 8192 }  // verhoogd van 4096
);
```

### Rendering (StapSectorVertaling.tsx — uitbreiding in domein-loop regel 380-422)

```tsx
// Binnen DOMEIN_ORDER.map, in plaats van de huidige "advies-state" block (regel 380-422)
return (
  <div
    key={domein}
    className={`border ${colors.border} ${colors.bg} rounded-lg p-4`}
    data-testid={`sub-effort-rich-${groep.id}-${domein}`}
  >
    {/* Header-strip */}
    <div className="flex items-center justify-between mb-3 gap-1">
      <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
        {DOMAIN_LABELS[domein]}
      </p>
      <div className="flex items-center gap-1">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
          advies.actie === "combineren" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {advies.actie === "combineren" ? "Combineren" : "Apart"}
        </span>
        {advies.actie === "combineren" && <HefboomBadge vermogens={groepVermogens} />}
      </div>
    </div>

    {/* Titel (Phase 18) of voorgesteldeNaam (fallback Phase 17) */}
    {(advies.titel || advies.voorgesteldeNaam) && (
      <h4 className="text-sm font-semibold text-[#003366] mb-2" data-testid={`sub-effort-titel-${groep.id}-${domein}`}>
        {advies.titel || advies.voorgesteldeNaam}
      </h4>
    )}

    {/* Beschrijving (Phase 18) */}
    {advies.beschrijving && (
      <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
        {advies.beschrijving}
      </p>
    )}

    {/* Beargumentatie (Phase 18) */}
    {advies.beargumentatie && (
      <section className="mb-3 pt-3 border-t border-gray-200">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Waarom cross-sectoraal opbouwen?
        </p>
        <p className="text-[12px] text-gray-700 leading-relaxed">{advies.beargumentatie}</p>
      </section>
    )}

    {/* VermogenImpact (Phase 18) */}
    {advies.vermogenImpact && advies.vermogenImpact.length > 0 && (
      <section className="mb-3 pt-3 border-t border-gray-200">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Vermogen-impact per sector
        </p>
        <ul className="space-y-1.5">
          {advies.vermogenImpact.map((v) => (
            <li key={v.vermogenId} className="flex items-start gap-2" data-testid={`vermogen-impact-${groep.id}-${domein}-${v.sectorId}`}>
              <SectorBadge sector={v.sectorId} />
              <span className="text-[12px] text-gray-700 flex-1">{v.impact}</span>
            </li>
          ))}
        </ul>
      </section>
    )}

    {/* Dossier (Phase 18) — expandable */}
    {advies.dossier && (
      <DossierSectie dossier={advies.dossier} testIdBase={`sub-effort-dossier-${groep.id}-${domein}`} />
    )}

    {/* Legacy: reden (Phase 17 compat) — alleen tonen als er geen beargumentatie is */}
    {!advies.beargumentatie && advies.reden && (
      <p className="text-[11px] text-gray-600 mb-2 leading-snug">{advies.reden}</p>
    )}

    {/* Gebundelde inspanningen (bestaande lijst) */}
    {relatedEfforts.length > 0 && (
      <section className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Gebundelde inspanningen
        </p>
        <ul className="text-[11px] text-gray-700 space-y-0.5">
          {relatedEfforts.map((eff) => (
            <li key={eff.id}>• {eff.title || eff.description}</li>
          ))}
        </ul>
      </section>
    )}
  </div>
);
```

Waar `DossierSectie` een nieuwe helper-component is in hetzelfde bestand:

```tsx
function DossierSectie({ dossier, testIdBase }: { dossier: SubEffortDossier; testIdBase: string }): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const entries: Array<[string, string | undefined]> = [
    ["Opdrachtgever", dossier.eigenaar],
    ["Inspanningsleider", dossier.inspanningsleider],
    ["Verwacht resultaat", dossier.verwachtResultaat],
    ["Kostenraming", dossier.kostenraming],
    ["Randvoorwaarden", dossier.randvoorwaarden],
  ];
  const hasAny = entries.some(([, v]) => v && v.length > 0);
  if (!hasAny) return null;

  return (
    <section className="mt-3 pt-3 border-t border-gray-200" data-testid={testIdBase}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-[#003366] hover:text-[#002244]"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Dossier {open ? "verbergen" : "openen"}
      </button>
      {open && (
        <dl className="mt-2 space-y-1.5">
          {entries.map(([label, value]) =>
            value ? (
              <div key={label} className="grid grid-cols-[140px_1fr] gap-2 text-[12px]">
                <dt className="font-semibold text-gray-500">{label}</dt>
                <dd className="text-gray-700">{value}</dd>
              </div>
            ) : null
          )}
        </dl>
      )}
    </section>
  );
}
```

## Assumptions Log

Geen `[ASSUMED]` claims in deze research — alle beweringen zijn direct geverifieerd tegen source files (absolute paths gegeven in Current Code Inventory). Belangrijkste verificaties:

| Claim | Verificatie |
|-------|-------------|
| `InspanningsDossierSchema` bestaat en heeft 5 velden | `schemas.ts:88-94` geïnspecteerd |
| `SubEffortAdviesSchema` huidige shape | `schemas.ts:330-337` geïnspecteerd |
| Phase 17 AI-call structuur | `route.ts:244-284` geïnspecteerd |
| Wizard stuurt focusGoals | `CrossAnalyseWizard.tsx:204-219` geïnspecteerd |
| `vitest.config.ts` filter | regel 11 geïnspecteerd |
| Demo-data bestaat en heeft 4 entries | `demo-data.ts:755-796` geïnspecteerd |
| `getFocusGoal` is al geïmporteerd in route.ts | regel 23 geïnspecteerd |
| `zod ^4.3.6` en `vitest ^4.1.2` | `package.json` via npm-grep |
| Domein kleuren in CLAUDE.md vs code | CLAUDE.md methodiek-sectie + `DOMAIN_COLORS` regel 34-39 |

## Open Questions

1. **Welk dossier-schema-patroon kiezen?** — `InspanningsDossierSchema.partial()` (compact) vs. nieuwe `SubEffortDossierSchema` met explicit `.optional().default("")` (consistent met Phase 14 `AIPromotedEffortSchema`).
   - Recommended: patroon 2 (nieuwe schema) — consistenter, renderer hoeft geen `??` fallbacks.

2. **Grid-layout voor rijke kaarten?** — Huidige 4-kolom grid wordt te smal.
   - Recommended: `grid-cols-1 lg:grid-cols-2` (2×2 op desktop) voor leesbaarheid. Tradeoff: meer verticale scroll.

3. **Fallback wanneer `focusGoal.description` leeg is?** — Kiezen voor naam-fallback of skip focus-doel-block.
   - Recommended: naam-fallback met een disclaimer in prompt ("als \`beschrijving\` leeg is, gebruik \`naam\` als inkleiding").

4. **`maxTokens` verhogen?** — Huidig 4096, rijke response kan dit doorbreken.
   - Recommended: `8192`. Royaal voor 4 rijke advises per groep-call.

5. **AI-prompt rolnaam-voorbeelden inbouwen?** — Geeft consistenter output maar risico op stiff/generic taal.
   - Recommended: minimale lijst in prompt ("Directie, Sectormanager, Programmamanager, Business Process Owner, CIO") met "of vergelijkbare rol passend bij de inspanning".

6. **Titel-guard in runtime?** — Moet `titel` runtime-gevalideerd worden via `validateNeutralTitle`?
   - Recommended: NEE, prompt-instructie is afdoende; AI heeft in Phase 17 dit patroon al goed gevolgd voor `voorgesteldeNaam`. Als regressies optreden, toevoegen in Phase 19.

7. **Tests voor rendering?** — vitest-config sluit `.tsx` uit.
   - Recommended: accept — rendering verificatie via human UAT zoals Phase 17. Optioneel kan een planner een `.test.ts` schrijven die `render()` uit `@testing-library/react` gebruikt en de config aanpast om `.tsx` tests toe te laten — maar dat is scope-creep voor Phase 18.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | (niet geïnspecteerd — niet noodzakelijk voor schema/code wijziging) | — |
| npm | Package manager | ✓ | (al in gebruik) | — |
| zod | Schema-validatie | ✓ | 4.3.6 | — |
| @anthropic-ai/sdk | AI API | ✓ | 0.78.0 | — |
| vitest | Tests | ✓ | 4.1.2 | — |
| ANTHROPIC_API_KEY | AI runtime | ⚠ vereist voor real AI | (env-var) | Route heeft graceful 503 fallback (`route.ts:72-77`) |
| Next.js dev server | Local testing | ✓ (`npm run dev`) | 16.1.0 | — |

**Missing dependencies:** Geen. Phase 18 is puur code-wijziging in bestaande stack.

## State of the Art

Niet relevant voor Phase 18 — we blijven binnen bestaande dependencies (zod 4, Claude Opus 4.7, React 19, Next 16). Geen deprecated patterns geraakt.

## Sources

### Primary (HIGH confidence)

- `src/lib/schemas.ts` (volledig gelezen) — bestaand schema-contract
- `src/lib/prompts.ts` (volledig gelezen) — bestaande prompts, precedenten voor domein-instructies
- `src/app/api/cross-analyse/route.ts` (volledig gelezen) — API orchestratie
- `src/components/cross-analyse/StapSectorVertaling.tsx` (volledig gelezen) — rendering
- `src/lib/demo-data.ts:1-60, 440-803` — demo-structuur
- `src/lib/__tests__/cross-analyse-schema.test.ts` (volledig gelezen) — test-patterns
- `src/lib/stap5-focus.ts` (volledig gelezen) — getFocusGoal helper hergebruik
- `src/components/cross-analyse/CrossAnalyseWizard.tsx:190-268` — wizard API-call
- `vitest.config.ts` — test-framework config
- `.planning/ROADMAP.md:303-321` — Phase 18 spec
- `.planning/REQUIREMENTS.md` (volledig) — requirement-namespaces
- `.planning/STATE.md` (volledig) — project state + decisions
- `.planning/phases/17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie/17-VERIFICATION.md` (volledig) — Phase 17 pitfalls
- `.planning/phases/17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie/17-CONTEXT.md:1-60` — Phase 17 methodische beslissingen
- `CLAUDE.md` (volledig uit system-reminder) — project conventies
- `package.json` — dependency versies geverifieerd

### Secondary (MEDIUM confidence)

- Geen — alle benodigde info uit primary sources

### Tertiary (LOW confidence)

- Geen

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — alle libs in package.json geverifieerd
- Architecture: HIGH — Phase 17 VERIFICATION.md + 17-CONTEXT.md geven gedetailleerd ontwerp-precedent
- Pitfalls: HIGH — 8 concrete pitfalls uit Phase 17 artifacts, allemaal met mitigatie
- Schema strategy: HIGH — exact veld-lijst uit ROADMAP success criteria + Zod-patterns uit bestaande schemas
- Rendering strategy: MEDIUM — layout-keuze vereist planner-beslissing (4 open questions)
- Demo-data strategy: HIGH — bestaande structuur in demo-data.ts:755-796 is compleet qua domein-dekking; Phase 18 is uitbreiden, niet herschrijven

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stabiele codebase, geen externe dependencies die snel muteren)
