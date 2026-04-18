---
phase: 17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
plan: 03
subsystem: cross-analyse
tags:
  - ai-pipeline
  - prompts
  - api
  - zod
  - consolidation
  - parallel
  - d-25
  - d-30
  - d-31
requirements:
  - R-CROSS-01
  - R-CROSS-02
requirements_addressed:
  - R-CROSS-01
  - R-CROSS-02
dependency_graph:
  requires:
    - "17-01 VermogenGelijkenisGroepSchema + SubEffortAdviesSchema + Stap4ResultSchema.subEffortAnalysis"
    - "17-01 markeer_gelijkenis enum-waarde + context veld"
    - "17-02 guards werkend (validateNeutralTitle / validateSameDomain / validateDrieluikThreshold)"
  provides:
    - "CROSS_ANALYSE_STAP2_PROMPT herzien (D-25): markeer_gelijkenis i.p.v. combineren voor vermogens + vermogenGelijkenisGroepen output"
    - "CROSS_ANALYSE_STAP3_PROMPT herzien (D-27/D-31): drieluik-threshold + same-domain regel"
    - "CROSS_ANALYSE_STAP4_PROMPT herzien (D-25/D-30/D-31): type UITSLUITEND inspanning; voorgesteldeNaam regels"
    - "CONSOLIDATIE_HERZIEN_PROMPT (nieuw, D-19): herziet één advies o.b.v. user-context"
    - "SUB_EFFORT_ANALYSE_PROMPT (nieuw, D-30): per groep × domein advies combineren/apart_houden"
    - "/api/din-suggest consolidatie-herzien tak (Zod-gevalideerd, 503/422)"
    - "/api/cross-analyse stap 4 uitbreiding: subEffortAnalysis[] via Promise.all per VermogenGelijkenisGroep"
  affects:
    - "Wave 3 (Plan 17-04): UI rendert subEffortAnalysis per groep + domein in organigram"
    - "Wave 3 (Plan 17-04): StapConsolidatie gebruikt /api/din-suggest?type=consolidatie-herzien voor B-path user-context revisie"
tech_stack:
  added: []
  patterns:
    - "Parallel AI-calls via Promise.all voor groep-gebaseerde sub-analyses (D-10)"
    - "Skip-gate in map-closure om lege groepen niet naar AI te sturen (D-13)"
    - "Zod-schema-import uit @/lib/schemas i.p.v. lokale declaratie (hergebruik Wave 0 SubEffortAdviesSchema)"
    - "Response-shape branching via stap === 4 ternary in NextResponse.json"
    - "Verbatim lokale variabel-namen hergebruik (capsData, effortsData, kibContext, body.capabilityEffortMaps — W-4 fix)"
key_files:
  created: []
  modified:
    - "src/lib/prompts.ts (Task 1: stap 2/3/4 herzien + 2 nieuwe prompts)"
    - "src/app/api/din-suggest/route.ts (Task 2: consolidatie-herzien tak + ConsolidatieHerzienResponseSchema)"
    - "src/app/api/cross-analyse/route.ts (Task 2: stap 4 parallel sub-effort analyse + subEffortAnalysis in response)"
    - "src/lib/__tests__/cross-analyse-schema.test.ts (Task 2: integratie-casus voor Stap4ResultSchema met subEffortAnalysis)"
decisions:
  - "Promise.all gekozen boven sequentieel voor sub-effort analyse: typische N=1-3 groepen, verwachte totale tijd 3-15s, ruim binnen 300s maxDuration. Bij N>5 wordt het risico groter — documenteer in runtime profiel"
  - "Skip-gate voor lege groepen vóór AI-call (groepEfforts.length === 0 → return []) om tokens te besparen per D-13"
  - "consolidatie-herzien branch retourneert 503 bij missende ANTHROPIC_API_KEY (hard gate), 422 met retryable=true bij Zod-fail — consistent met andere AI-takken"
  - "maxRetries=1 op ConsolidatieHerzien (i.p.v. default 2): herzie is een snelle flow en gebruiker wacht in UI; 1 retry is pragmatische balans"
  - "Bestaande consolidatie-advies tak (die body.prompt gebruikt, free-form) blijft ongewijzigd — deze is een aparte pre-existing flow en niet binnen scope 17-03"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-18"
  test_count_added: 1
  tasks_completed: 2
---

# Phase 17 Plan 03: Wave 2 — AI-pipeline (prompts + API-takken) Summary

AI-pipeline Wave-2 geland: vier prompt-revisies (stap 2/3/4 herzien, nieuwe CONSOLIDATIE_HERZIEN_PROMPT + SUB_EFFORT_ANALYSE_PROMPT) borgen D-25/D-30/D-31 methodiek-correctie; `/api/din-suggest` kreeg een Zod-gevalideerde `consolidatie-herzien` tak; `/api/cross-analyse` stap 4 roept nu parallel `SUB_EFFORT_ANALYSE_PROMPT` aan per `VermogenGelijkenisGroep` en merged `subEffortAnalysis[]` in de response — build + targeted test + backward-compat suite groen, alleen de 8 pre-existing failures (persistence/schemas/stap5-focus-filter) blijven onveranderd.

## Performance

- **Duration:** ~15 min (Task 1: ~10 min, Task 2: ~5 min post-resume)
- **Completed:** 2026-04-18
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Stap 2/3/4 prompts structureel herzien conform D-25 (vermogens NOOIT samengevoegd in cross-analyse) en D-31 (cross-domein clusters methodisch fout)
- Twee nieuwe prompts: `CONSOLIDATIE_HERZIEN_PROMPT` (D-19 user-context revisie) + `SUB_EFFORT_ANALYSE_PROMPT` (D-30 per-domein analyse onder drieluik)
- `/api/din-suggest` uitgebreid met `consolidatie-herzien` tak voor enkele-cluster herziening
- `/api/cross-analyse` stap 4 draait N parallelle sub-effort calls per drieluik-groep via Promise.all, met empty-group skip-gate (D-13)
- Integratie-test dekt volledige Stap4ResultSchema shape inclusief `subEffortAnalysis[]` + `consolidatieAdvies[].context`

## Task Commits

1. **Task 1: Herziene prompts + CONSOLIDATIE_HERZIEN + SUB_EFFORT_ANALYSE** — `25c57f9` (feat)
2. **Task 2: /api/din-suggest consolidatie-herzien tak + /api/cross-analyse stap 4 parallel SUB_EFFORT_ANALYSE** — `d6d50f7` (feat)

## Files Modified

- `src/lib/prompts.ts` — CROSS_ANALYSE_STAP2/3/4_PROMPT herzien; 2 nieuwe exports toegevoegd tussen STAP4 en STAP5 (regel 339-387)
- `src/app/api/din-suggest/route.ts` — +56 regels: `CONSOLIDATIE_HERZIEN_PROMPT` import, `ConsolidatieHerzienResponseSchema`, nieuwe branch (regel 78-127)
- `src/app/api/cross-analyse/route.ts` — +71 regels: `SubEffortAdviesSchema` + `SUB_EFFORT_ANALYSE_PROMPT` imports, `z` import van type-only naar waarde, stap-4 parallel Promise.all blok, response-branching via ternary
- `src/lib/__tests__/cross-analyse-schema.test.ts` — +45 regels: nieuwe describe `"Stap4ResultSchema sub effort advies integration (D-30)"` met integratie-test

## Exacte toegevoegde instructies per prompt (voor Wave 3 copy-consistency)

### STAP 2 — vermogenGelijkenisGroepen + markeer_gelijkenis regels (D-25)

Toegevoegd direct na `Gebruik de id-velden om items te identificeren in je clusters.` en vóór de `Antwoord ALLEEN als JSON-object`-regel:

```
BELANGRIJK — Vermogens worden NIET samengevoegd in cross-analyse (D-25).
De drie sector-vermogens blijven aparte records. Markeer uitsluitend gelijkenis via `vermogenGelijkenisGroepen`.

Voor elke groep van gelijkende sector-vermogens:
- Minimaal ÉÉN vermogen per sector uit {PO, VO, Zakelijk}. Als je geen drieluik kunt samenstellen (bv. één sector mist), laat die vermogens ongeclusterd.
- `gezamenlijkeOmschrijving`: waarom deze vermogens inhoudelijk op elkaar lijken (zelfde capaciteit, zelfde doel-keten).
- `reden`: korte onderbouwing (1-2 zinnen, methodiek-conform).

Voor `vermogenClusters[].aanbeveling`: gebruik UITSLUITEND `"markeer_gelijkenis"` wanneer het een cross-sector gelijkenis betreft. `"combineren"` is NIET toegestaan voor vermogens in cross-analyse. De enum-waardes `"afstemmen"` en `"apart_houden"` zijn toegestaan.
```

Toegevoegd in JSON-output-voorbeeld (na `hefboomwerking`, vóór `samenvatting`):

```json
"vermogenGelijkenisGroepen": [
  {
    "id": "g1",
    "vermogenIds": ["<cap-po-id>", "<cap-vo-id>", "<cap-zak-id>"],
    "gezamenlijkeOmschrijving": "Medewerker-wendbaarheid bij digitalisering",
    "reden": "Alle drie sectoren vereisen adaptief vermogen bij snelle digitaliseringstrajecten."
  }
]
```

Toegevoegd enum-regel (vervanger van de verwijderde oude regel):

```
aanbeveling MOET exact een van: "markeer_gelijkenis", "afstemmen", "apart_houden" zijn. "combineren" is NIET toegestaan voor vermogens in cross-analyse (D-25).
```

### STAP 3 — cluster-regel drieluik + same-domain (D-27/D-31)

Toegevoegd direct na `Koppel lopende projecten aan DIN-inspanningen (match/geen match).`:

```
Cluster-regel inspanningen (D-27, D-31):
Een inspannings-cluster is ALLEEN geldig wanneer:
1. Alle items hetzelfde `domain` hebben (Mens, Processen, Data & Systemen, Cultuur). Cross-domein clusters zijn methodisch fout.
2. Alle items via `capabilityEffortMap` terug-refereren naar vermogens uit dezelfde `VermogenGelijkenisGroep` (zie stap 2 output) die alle drie sectoren (PO, VO, Zakelijk) bevat.

Als een inspanning geen drieluik-gekoppelde vermogens raakt, laat die inspanning ongeclusterd (of in een single-item cluster met `aanbeveling: "apart_houden"`).

`clusterTitel` + eventuele `voorgesteldeNaam` zijn ALTIJD sectoroverstijgend (geen `PO`/`VO`/`Zakelijk`/`primair onderwijs`/`voortgezet onderwijs` substrings, minimum 10 tekens).
```

### STAP 4 — consolidatie-advies regels (D-25/D-30/D-31)

Toegevoegd direct na de `"cultuur"`-domeinregel en vóór `Voor elk domein:`:

```
Consolidatie-advies regels (D-25, D-30, D-31):
- `consolidatieAdvies[].type` is UITSLUITEND `"inspanning"` in cross-analyse. Produceer GEEN `type: "vermogen"` advies — vermogens worden niet meer samengevoegd in cross-analyse (zie D-25). Het bestaande `type: "inspanning"` voorbeeld hieronder is het enige geldige patroon.
- `aanbeveling: "combineren"` is ALLEEN toegestaan wanneer ALLE cluster-items hetzelfde `domain` hebben.
- `voorgesteldeNaam` is verplicht bij `"combineren"` en MOET sectoroverstijgend zijn (geen `PO`/`VO`/`Zakelijk`/`primair onderwijs`/`voortgezet onderwijs` substrings, minimum 10 tekens).
- Bij `"afstemmen"` of `"apart_houden"`: `voorgesteldeNaam` mag `null` of weggelaten worden.
```

Toegevoegd type-regel (vervanger van de verwijderde oude regel):

```
type MOET exact "inspanning" zijn in cross-analyse-output (D-25). "vermogen" is NIET toegestaan.
```

## Exacte lijst verwijderde regels per STAP (audit trail)

### STAP 2 — verwijderd (Task 1)

1. `Analyseer welke vermogens door meerdere sectoren gedeeld worden en waar hefboomwerking zit.` (oude regel 167)
2. `Cluster vermogens die semantisch op hetzelfde neerkomen over sectoren heen.` (oude regel 169)
3. `Identificeer inspanningen die aan meerdere baten bijdragen (hefboomwerking).` (oude regel 171)
4. `aanbeveling MOET exact een van: "combineren", "afstemmen", "apart_houden" zijn.` (oude regel 190)
5. In JSON-voorbeeld: `"aanbeveling": "combineren"` (oude regel 181) — vervangen door `"aanbeveling": "markeer_gelijkenis"`

### STAP 3 — geen verwijderingen

(Bestaande instructie-frame bleef compatibel; alleen toevoegingen.)

### STAP 4 — verwijderd (Task 1)

1. Eerste `consolidatieAdvies`-voorbeeldobject met `"type": "vermogen"` (oude regel 260-267) — compleet verwijderd inclusief trailing komma
2. `type MOET exact "vermogen" of "inspanning" zijn.` (oude regel 310) — vervangen

## Response-shape contracten

### /api/din-suggest?type=consolidatie-herzien

**Request body:**

```json
{
  "type": "consolidatie-herzien",
  "clusterTitel": "string",
  "clusterItems": [
    { "beschrijving": "string", "sector": "PO|VO|Zakelijk", "domein": "mens|processen|data_systemen|cultuur" }
  ],
  "origineelAdvies": {
    "aanbeveling": "combineren|afstemmen|apart_houden",
    "reden": "string",
    "voorgesteldeNaam": "string|null",
    "afstemmingsStappen": ["string"]
  },
  "userContext": "string (optioneel — verklaart waarom origineel advies niet past)",
  "kibGoals": [],
  "kibScope": {}
}
```

**Response (200 — success):**

```json
{
  "success": true,
  "data": {
    "aanbeveling": "combineren" | "afstemmen" | "apart_houden",
    "reden": "string",
    "voorgesteldeNaam": "string | null",
    "afstemmingsStappen": ["string", "..."]
  }
}
```

**Response (503 — no API key):**

```json
{ "success": false, "error": "ANTHROPIC_API_KEY niet geconfigureerd." }
```

**Response (422 — Zod-fail, retryable):**

```json
{ "success": false, "error": "Validation failed: ...", "retryable": true }
```

### /api/cross-analyse?stap=4 (na uitbreiding)

**Response (200) — nu aangevuld met `subEffortAnalysis[]`:**

```json
{
  "success": true,
  "data": {
    "analysis": {
      "consolidatieAdvies": [
        {
          "clusterTitel": "Medewerkerstraining cluster",
          "type": "inspanning",
          "aanbeveling": "combineren",
          "reden": "...",
          "voorgesteldeNaam": "Sector-overstijgende klantgesprek-training",
          "afstemmingsStappen": [],
          "context": "optioneel user-context uit B-path herziening"
        }
      ],
      "citobreedInzicht": [ /* 4 domein-entries */ ],
      "samenvatting": "...",
      "subEffortAnalysis": [
        {
          "groepId": "g1",
          "domein": "mens",
          "actie": "combineren",
          "items": ["eff-po-1", "eff-vo-1", "eff-zak-1"],
          "reden": "Drie trainingen met identieke inhoud",
          "voorgesteldeNaam": "Sector-overstijgende training"
        },
        {
          "groepId": "g1",
          "domein": "processen",
          "actie": "apart_houden",
          "items": ["eff-proc-1"],
          "reden": "Proces-gebonden aan sector-governance",
          "voorgesteldeNaam": null
        }
      ]
    },
    "stap": 4
  }
}
```

**Empty-groep gedrag (D-13):** als een `VermogenGelijkenisGroep` geen gekoppelde efforts heeft (via `body.capabilityEffortMaps`), wordt de AI-call voor die groep overgeslagen en levert de groep een lege subset `[]` aan de flat-array. Dit wordt NIET als lege entries in de response gezet.

**Geen stap2Result.vermogenGelijkenisGroepen:** fallback is `[]`, `subEffortAnalysis` blijft leeg. Backward-compatible met oudere clients die nog geen Wave 0 schemas gebruiken.

## Promise.all vs sequentieel — keuze en rationale

Gekozen: **Promise.all** (zie code regel 244 van `cross-analyse/route.ts`).

**Rationale:**
- Typische N=1-3 drieluik-groepen per sessie (Cito-programma heeft meestal 1-3 sectoroverstijgende vermogen-clusters)
- `maxTokens: 4096` per sub-call → ~3-5s per call met sonnet-4-6 of opus-4-6
- N=3 parallel → ~5s totaal; N=3 sequentieel → ~15s totaal
- Parent `maxDuration = 300s` (route.ts regel 24) dekt ruim voor N≤20

**Runtime-risico (Pitfall 5 RESEARCH.md):** bij N>10 drieluik-groepen kan Promise.all de maxDuration overschrijden. Bij deze sessie-shape is dat onwaarschijnlijk (drieluik-drempel is al een streng filter dat de meeste vermogens uitsluit).

**Mitigatie toekomst:** als runtime-profiel groter wordt (telemetrie via D-12 error-logging in Phase 16), kan een sequentiële `for-of await` loop of `p-limit(5)` worden geïntroduceerd. Buiten scope 17-03.

## Bevestiging: lokale variabel-namen onveranderd (W-4)

Zoals geïnstrueerd in het plan zijn de bestaande variabel-namen verbatim hergebruikt:

| Plan-spec naam | Regel in route.ts | Gebruikt in Task 2 blok? |
|----------------|-------------------|---------------------------|
| `kibContext` | 70 | Ja (regel 266 in sub-prompt assembly) |
| `capsData` | 104 | Ja (regel 247: `capsData.filter(...)`) |
| `effortsData` | 107 | Ja (regel 253: `effortsData.filter(...)`) |
| `body.capabilityEffortMaps` | 121 (in struct), direct in Task 2 | Ja (regel 238: `body.capabilityEffortMaps ?? []`) |
| `body.stap2Result` | 44 (in buildCumulativeContext) | Ja (regel 229: `body.stap2Result as { vermogenGelijkenisGroepen?... }`) |

Geen variabel-rename, geen shadowing, geen collision met bestaande `stap === 5` payload-narrowing.

## Deviations from Plan

### Auto-fixed Issues

**None** — Task 2 executed exactly as written. Pre-existing dirty working tree van eerdere sessies (Wave 3 UI-files, `consolidatie-advies` branch in din-suggest met `body.prompt`) was already-committed in Task 1 (`25c57f9`) of niet binnen scope. Geen Rule 1/2/3 auto-fixes toegepast.

**Opmerking over pre-existing `consolidatie-advies` branch:** De bestaande branch in `din-suggest/route.ts` regel 41-76 gebruikt `body.prompt` (free-form) en niet `body.clusterItems`/`body.origineelAdvies` — dit is een ander contract dan `consolidatie-herzien`. Beide coexisteren (klonen), zoals het plan specificeerde ("voeg de `consolidatie-herzien` tak toe DIRECT NA de bestaande `consolidatie-advies` tak"). Geen conflict.

### Out-of-scope findings (deferred)

De 8 pre-existing test failures (persistence 5, schemas 1, stap5-focus-filter 2) blijven onveranderd en vallen buiten 17-03 scope. Zie `.planning/phases/17-.../deferred-items.md`.

### Tooling

`npm run lint` blijft gebroken op Windows (space-in-path, pre-existing). Niet-blocking — build en tests draaien via vitest en next gewoon.

## Test Results

**Targeted:**
```
npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "sub effort advies"
→ Test Files  1 passed (1)
→ Tests  4 passed | 19 skipped (23)
```

**Build:**
```
npm run build → exit 0 (Compiled successfully in 4.9s, 15 static pages generated)
```

**Full suite:**
```
npx vitest run → Test Files 3 failed | 18 passed (21); Tests 8 failed | 309 passed (317)
```

De 8 failures zijn dezelfde pre-existing failures uit 17-01/17-02 summaries (persistence.test.ts 5, schemas.test.ts 1, stap5-focus-filter.test.ts 2). **Geen regressies** door 17-03.

## Wave 3 Handoff

Wave 3 (Plan 17-04) kan direct starten met:

1. **StapConsolidatie B-path** — gebruikt `/api/din-suggest?type=consolidatie-herzien` met `{clusterTitel, clusterItems, origineelAdvies, userContext}` → Zod-gevalideerde response
2. **Organigram-render** — leest `session.crossAnalyseResults.stap4.subEffortAnalysis[]` en rendert per groep × domein een kaart met `actie` (combineren/apart_houden), `items`, `voorgesteldeNaam`
3. **Error-banner copy** — indien 422-error van `consolidatie-herzien`: toon `retryable: true` UI-hint (zoals bestaande patterns in DINMappingStep)

De 3 prompts (stap 2/3/4) produceren nu data-shapes die Wave 3 UI direct kan consumeren zonder client-side schema-conversie.

## Self-Check: PASSED

**Files verified:**

- FOUND: `src/lib/prompts.ts` (2 nieuwe exports, 3 herziene prompts, geen oude conflicterende regels)
- FOUND: `src/app/api/din-suggest/route.ts` (consolidatie-herzien branch, ConsolidatieHerzienResponseSchema, 503/422 handling)
- FOUND: `src/app/api/cross-analyse/route.ts` (Promise.all voor SUB_EFFORT_ANALYSE_PROMPT, skip-gate, subEffortAnalysis in response)
- FOUND: `src/lib/__tests__/cross-analyse-schema.test.ts` (integratie-casus met subEffortAnalysis)

**Commits verified:**

- FOUND: `25c57f9` — feat(17-03): prompts herzien + CONSOLIDATIE_HERZIEN + SUB_EFFORT_ANALYSE (Task 1)
- FOUND: `d6d50f7` — feat(17-03): consolidatie-herzien tak + stap 4 sub-effort analyse (Task 2)

**Acceptance criteria verified:**

- [x] `src/app/api/din-suggest/route.ts` bevat string `"consolidatie-herzien"` (3 hits)
- [x] Importeert `CONSOLIDATIE_HERZIEN_PROMPT` uit `@/lib/prompts`
- [x] Bevat `ConsolidatieHerzienResponseSchema` (z.object met 4 velden)
- [x] Retourneert 503 bij missende `ANTHROPIC_API_KEY`
- [x] Retourneert 422 met `retryable: true` bij Zod-fail
- [x] `src/app/api/cross-analyse/route.ts` importeert `SUB_EFFORT_ANALYSE_PROMPT` + `SubEffortAdviesSchema`
- [x] Bevat `Promise.all(` binnen stap 4 branch
- [x] Bevat response-veld `subEffortAnalysis` in `NextResponse.json` payload (3 hits)
- [x] Skip-gate `if (groepEfforts.length === 0) return [];` aanwezig
- [x] Gebruikt verbatim `capsData`, `effortsData`, `kibContext` (geen rename)
- [x] `src/lib/__tests__/cross-analyse-schema.test.ts` bevat `describe("Stap4ResultSchema sub effort advies integration`
- [x] Targeted test exit 0
- [x] `npm run build` exit 0
- [x] Geen regressies in full suite (8 pre-existing failures blijven)
