---
phase: 01-zod-schema-validatie
verified: 2026-03-30T22:30:00Z
status: passed
score: 3/3 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Foutmelding bij ongeldige AI response tonen aan gebruiker"
    expected: "Na 2 mislukte retries verschijnt een zichtbare foutmelding in het Nederlands met context, plus een textarea waarmee de gebruiker extra instructies kan meegeven"
    why_human: "Vereist UI-interactie: een nep-AI-respons triggeren is niet mogelijk zonder een lopende server en gesimuleerde API-fout"
  - test: "Retry met gebruikersfeedback werkt end-to-end"
    expected: "Na het invullen van extra instructies in de textarea en klikken op 'Opnieuw proberen' wordt userFeedback meegestuurd in de request body en de AI doet een nieuwe poging"
    why_human: "Vereist browser-interactie met lopende dev server en AI API"
---

# Phase 1: Zod Schema Validatie Verification Report

**Phase Goal:** AI responses worden betrouwbaar geparsed en opgeslagen als getypeerde objecten
**Verified:** 2026-03-30T22:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Elke AI response wordt gevalideerd tegen een Zod schema voordat deze wordt opgeslagen | VERIFIED | `callClaudeWithValidation` in ai-client.ts (line 126) roept `parseAIResponse` aan die `schema.safeParse()` uitvoert; alle 4 AI-routes gebruiken dit patroon |
| 2 | Bij een AI response die niet voldoet aan het schema, krijgt de gebruiker een foutmelding (geen stille corruptie) | VERIFIED | API routes retourneren `{ success: false, error: result.error, retryable: true }` met HTTP 422; alle 6 client-componenten hebben `aiRetryable` state en tonen een textarea feedback UI |
| 3 | Alle opgeslagen DIN-data (baten, vermogens, inspanningen) zijn getypeerde objecten, niet ruwe strings | VERIFIED | `src/lib/schemas.ts` definieert `DINBenefitSchema`, `DINCapabilitySchema`, `DINEffortSchema` als Zod schemas; `src/lib/types.ts` re-exporteert alle types via `z.infer<>` — geen handmatige interface-duplicatie |

**Score:** 3/3 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/lib/schemas.ts` | Single source of truth voor alle Zod schemas | VERIFIED | 667 regels, bevat alle enum-, entiteit-, AI-response-, analyse- en KiB-import schemas; 52 `z.infer<>` type-exports |
| `src/lib/types.ts` | Re-exports van z.infer<> types + constanten | VERIFIED | Geen `interface` definities meer; re-exporteert alle types uit `./schemas`; behoudt SECTORS, DOMAIN_LABELS, STATUS_LABELS, APP_STEPS |
| `vitest.config.ts` | Vitest configuratie met @/ pad-alias | VERIFIED | `resolve.alias: { "@": path.resolve(__dirname, "./src") }` aanwezig |
| `src/lib/__tests__/schemas.test.ts` | Schema structuur- en legacy-data tests | VERIFIED | 16 tests, alle groen |

### Plan 02 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ai-client.ts` | extractJSON, parseAIResponse, callClaudeWithValidation | VERIFIED | Alle 3 functies geexporteerd; MAX_RETRIES = 2; ParseResult<T> discriminated union |
| `src/app/api/din-mapping/route.ts` | Gevalideerde DIN-mapping | VERIFIED | Importeert `callClaudeWithValidation` en `AIDINMappingResponseSchema`; geen regex parsing |
| `src/app/api/din-suggest/route.ts` | Gevalideerde DIN-suggest | VERIFIED | Alle 3 modes (domain-recommend, create, suggest) gebruiken `callClaudeWithValidation` met juist schema |
| `src/lib/__tests__/ai-parsing.test.ts` | Tests voor JSON extractie, validatie, retry | VERIFIED | 14 tests, alle groen (inclusief gemockte callClaudeWithValidation tests) |

### Plan 03 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/lib/kib-import.ts` | KiB import met Zod validatie | VERIFIED | `KiBExportSchema.safeParse()` aanwezig; geen `as KiBExport` type assertion |
| `src/lib/__tests__/kib-import.test.ts` | Tests voor KiB import validatie | VERIFIED | 9 tests, alle groen |
| `src/components/steps/CrossAnalyseStep.tsx` | Geen client-side JSON parsing, retryable UI | VERIFIED | `aiRetryable` state + `userFeedback` (3 occurrences); geen regex match patronen |
| `src/components/steps/SectorWerkStep.tsx` | Geen client-side JSON parsing, retryable UI | VERIFIED | `aiRetryable` state + `userFeedback` (4 occurrences); geen regex match patronen |
| `src/components/steps/DINMappingStep.tsx` | Geen handmatige JSON parsing, retryable UI | VERIFIED | `aiRetryable` state + `userFeedback` (5 occurrences) |
| `src/components/din/BenefitCard.tsx` | Retryable feedback UI | VERIFIED | `aiRetryable` state + `userFeedback` (2+3 occurrences) |
| `src/components/din/DINCreatieWizard.tsx` | Retryable feedback UI | VERIFIED | `aiRetryable` state + `userFeedback` (6+9 occurrences) |
| `src/components/steps/SectorIntegratieStep.tsx` | Retryable feedback UI | VERIFIED | `aiRetryable` state + `userFeedback` (4+4 occurrences) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/types.ts` | `src/lib/schemas.ts` | re-export z.infer<> types | WIRED | `export type { DINBenefit, ... } from "./schemas"` op regels 6-40 |
| `src/lib/__tests__/schemas.test.ts` | `src/lib/schemas.ts` | import schemas voor testing | WIRED | `import { DINBenefitSchema, ... } from "@/lib/schemas"` |
| `src/app/api/din-mapping/route.ts` | `src/lib/ai-client.ts` | callClaudeWithValidation import | WIRED | `import { callClaudeWithValidation } from "@/lib/ai-client"` regel 2 |
| `src/lib/ai-client.ts` | `src/lib/schemas.ts` | schema imports via API routes | WIRED | API routes importeren schemas rechtstreeks; ai-client.ts bevat `import { z } from "zod"` |
| `src/lib/kib-import.ts` | `src/lib/schemas.ts` | import KiBExportSchema | WIRED | `import { KiBExportSchema } from "./schemas"` regel 4 |
| `src/components/steps/CrossAnalyseStep.tsx` | `src/app/api/cross-analyse` | fetch met retryable flag | WIRED | `fetch.*api/cross-analyse` aanwezig; component verwerkt `json.retryable` |
| `src/components/din/DINCreatieWizard.tsx` | `src/app/api/din-suggest` | fetch met retryable flag | WIRED | `fetch.*api/din-suggest` aanwezig; component verwerkt `json.retryable` |

---

## Data-Flow Trace (Level 4)

Data-flow trace is niet van toepassing voor deze fase: de fase produceert validatie-utilities en schema-definities, geen componenten die dynamische data renderen uit een database. De koppeling van Zod-gevalideerde data naar de bestaande rendering is backward-compatible (sessions worden als JSON.stringify opgeslagen voor bestaande persistence).

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 39 tests groen (schemas: 16, ai-parsing: 14, kib-import: 9) | `npx vitest run src/lib/__tests__/schemas.test.ts src/lib/__tests__/ai-parsing.test.ts src/lib/__tests__/kib-import.test.ts` | 39/39 groen (worktree-tests buiten beschouwing) | PASS |
| npm run build slaagt zonder TypeScript fouten | `npm run build` | Succesvol, alle 7 API routes gebouwd, geen type-fouten | PASS |
| Geen regex JSON parsing in API routes | `grep -r "result.match" src/app/api/` | 0 matches | PASS |
| callClaudeWithValidation aanwezig in minstens 4 API routes | grep count | 11 calls in 4 files (din-mapping, din-suggest, cross-analyse, analyze-sectorplan) | PASS |
| retryable flag aanwezig in alle AI API routes | grep count | 10 occurrences in 6 files | PASS |
| userFeedback textarea aanwezig in alle 6 componenten | grep count | 29 occurrences in 6 files | PASS |

**Noot over worktrees:** Vitest pikt ook tests op uit `.claude/worktrees/` die stale agent-werkgebieden zijn. De `callClaudeWithValidation` tests in de worktrees falen vanwege een module-caching probleem met `vi.mock` en de gedeelde node_modules (geen ANTHROPIC_API_KEY in de worktree-omgeving). De tests in het hoofdproject (`src/lib/__tests__/`) slagen allemaal — dit is het enige relevante resultaat voor verificatie.

---

## Requirements Coverage

| Requirement | Source Plan | Beschrijving | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| DATA-02 | Plans 01, 02, 03 | AI responses worden gevalideerd met Zod schema's — geen gebroken JSON of ongestructureerde output | SATISFIED | `callClaudeWithValidation` + `parseAIResponse` + `KiBExportSchema.safeParse` dekken alle AI-aanroep- en import-paden; 39 tests bewijzen correct gedrag |

**Orphaned requirements check:** Alleen DATA-02 is in REQUIREMENTS.md aan Phase 1 toegewezen. Geen orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| n.v.t. | — | — | — | — |

Geen blocker anti-patterns gevonden. De volgende observaties zijn informationeel:

- `src/lib/ai-client.ts`: De legacy wrapper-functies (`generateDINMapping`, `generateCrossAnalyse`, etc.) roepen nog steeds `callClaude` direct aan (zonder Zod validatie). Dit is bewuste keuze — ze worden niet meer gebruikt door de API routes (die nu `callClaudeWithValidation` aanroepen), maar zijn behouden voor eventuele toekomstige directe aanroep. Severity: INFO — geen impact op fase-doelstelling.
- `src/app/api/din-mapping/route.ts` en `cross-analyse/route.ts`: Bevatten nog een `sectorAnalysis.match(/\{[\s\S]*\}/)` patroon, maar dit is voor het _verwerken van de sectorplan-analyse string als context voor de AI prompt_, niet voor het parsen van AI-output. Dit valt buiten de scope van DATA-02 en is geen stub. Severity: INFO.

---

## Human Verification Required

### 1. Foutmelding zichtbaar bij ongeldige AI response

**Test:** Gebruik de browser-devtools om een API call naar `/api/din-suggest` te onderscheppen en een `{ "invalid": true }` response te retourneren. Navigeer naar een DIN-mapping stap, open BenefitCard, klik op de AI-suggestie knop.
**Expected:** Een foutmelding verschijnt in het Nederlands (bijv. "Onverwachte AI-structuur: ..."), plus een textarea met label "Geef extra instructies mee voor een nieuwe poging" en een "Opnieuw proberen" knop.
**Why human:** Vereist browser-interactie met network request interceptie; niet testbaar met statische analyse.

### 2. Retry met userFeedback end-to-end

**Test:** Na het triggeren van de foutmelding (zie test 1), typ tekst in de textarea en klik "Opnieuw proberen". Monitor het netwerk-verzoek.
**Expected:** Het retry-verzoek bevat `userFeedback: "<getypte tekst>"` in de request body. Als de retry slaagt, verdwijnt de textarea en wordt de AI-output normaal verwerkt.
**Why human:** Vereist browser-interactie met werkende server en AI API.

---

## Gaps Summary

Geen gaps. Alle drie success criteria zijn volledig geimplementeerd en geverifieerd:

1. **Elke AI response gevalideerd:** `callClaudeWithValidation` is het centrale validatiepunt voor alle 4 JSON-retournerende AI-endpoints (`din-mapping`, `din-suggest`, `cross-analyse`, `analyze-sectorplan`). Ingebouwde `parseAIResponse` roept `schema.safeParse()` aan na JSON-extractie.

2. **Foutmelding bij schema-validatiefout:** API routes retourneren HTTP 422 met `{ success: false, error: "...", retryable: true }`. Alle 6 AI-aanroepende client-componenten verwerken `json.retryable === true` en tonen een textarea feedback UI (29 `userFeedback` occurrences over 6 bestanden).

3. **DIN-data zijn getypeerde objecten:** `src/lib/schemas.ts` is de single source of truth met 52 `z.infer<>` type-exports. `src/lib/types.ts` bevat geen `interface` definities meer — alleen re-exports en runtime constanten. De build slaagt zonder TypeScript-fouten.

---

_Verified: 2026-03-30T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
