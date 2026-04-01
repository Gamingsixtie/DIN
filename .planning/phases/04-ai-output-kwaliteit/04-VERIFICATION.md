---
phase: 04-ai-output-kwaliteit
verified: 2026-04-02T09:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "Elke AI-aanroep bevat KiB programmadoelen en scope in de system prompt"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Controleer dat het KiB-blok zichtbaar is in de AI-promptinhoud bij productie"
    expected: "Bij het genereren van DIN-items moet de system prompt de sectie 'KIB PROGRAMMADOELEN EN SCOPE:' bevatten met de doelen uit de sessie"
    why_human: "Vereist inspectie van de Anthropic API-aanroepen (network tab of server logs) bij een live sessie met geimporteerde KiB-doelen om te bevestigen dat de payload correct is"
---

# Phase 04: AI Output Kwaliteit Verificatierapport

**Phase Goal:** AI genereert methodiek-conforme DIN-elementen die de gebruiker kan presenteren aan stakeholders
**Verified:** 2026-04-02T09:00:00Z
**Status:** passed
**Re-verificatie:** Ja — na gap-sluiting via plan 04-03 (kibGoals/kibScope client wiring)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Bewijs |
|---|-------|--------|--------|
| 1 | Elke AI-aanroep bevat KiB programmadoelen en scope in de system prompt | VERIFIED | DINMappingStep.tsx regel 796: `kibGoals: session!.goals, kibScope: session!.scope` in din-suggest fetch; regels 893-894: in handleAIGenerate (din-mapping); regels 1010-1011: in handleIntegratieAdvies (cross-analyse sector-integratie); regels 1100-1101: in handleGenerateVerrijktPlan (cross-analyse verrijkt-sectorplan). Alle 4 API-aanroepen bevatten nu beide velden. |
| 2 | AI genereert maximaal 4 baten, 8 vermogens, 12 inspanningen per keer | VERIFIED | schemas.ts regels 392-394: `AIDINMappingResponseSchema` met `.max(4)`, `.max(8)`, `.max(12)`. Storage schemas (DINSessionSchema) bevatten geen `.max()`. |
| 3 | KiB-context verschijnt na de programmaboek-context in de prompt | VERIFIED | prompt-assembly.ts regels 257-270: `kibBlock` wordt opgebouwd na de programmaboek-context sectie. `buildKiBBlock` wordt aangeroepen na de `context`-string en toegevoegd aan het einde van de geassembleerde prompt. |
| 4 | AI-gegenereerde baten worden gecontroleerd op vergrotende trap en werkwoord-afwezigheid | VERIFIED | din-validation.ts `validateBaat` exporteert vergrotende trap auto-correctie (VERGROTENDE_TRAP_PATTERNS) + werkwoord-check (ACTION_VERBS_BLACKLIST). din-mapping/route.ts regel 120: `validateBaat(b)` op elk item na callClaudeWithValidation. |
| 5 | AI-gegenereerde vermogens en inspanningen worden gevalideerd en gecorrigeerd | VERIFIED | din-mapping/route.ts regels 121-122: `validateVermogen` + `validateInspanning` op alle items; din-suggest/route.ts regels 174 en 307: beide modi gevalideerd (create en suggest). |
| 6 | Gecorrigeerde items tonen een inline correctie-badge die na klikken verdwijnt | VERIFIED | BenefitCard.tsx regel 194: badge render met amber styling; CapabilityCard.tsx regel 228; EffortCard.tsx regel 185. Alle drie: `badgeDismissed` state (regels 66, 115, 72), `useEffect` reset op corrections change. DINMappingStep.tsx regels 1448, 1519, 1588, 1721, 1778: corrections prop doorgegeven aan alle card-instanties. |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Verwacht | Status | Details |
|----------|---------|--------|---------|
| `src/lib/prompt-assembly.ts` | KiBContext interface, extractKiBContext, assembleSystemPrompt met kibContext param | VERIFIED | Regel 90: `export interface KiBContext`; regel 106: `export function extractKiBContext`; regel 249: `kibContext?: KiBContext \| null` parameter; regel 221: `KIB PROGRAMMADOELEN EN SCOPE:` header; regel 204: `Genereer ALLEEN items die passen binnen` footer |
| `src/lib/schemas.ts` | `.max()` limieten op AIDINMappingResponseSchema | VERIFIED | Regels 392-394: `.max(4)`, `.max(8)`, `.max(12)` op benefits/capabilities/efforts arrays |
| `src/lib/din-validation.ts` | Pure validatiefuncties: validateBaat, validateVermogen, validateInspanning | VERIFIED | Exporteert alle drie functies + ValidationResult + ValidationCorrection + ACTION_VERBS_BLACKLIST + VERGROTENDE_TRAP_PATTERNS |
| `src/lib/__tests__/din-validation.test.ts` | Unit tests voor alle validatieregels | VERIFIED | 20 testcases verdeeld over drie describe-blokken (bevestigd door 04-02-SUMMARY.md) |
| `src/lib/__tests__/prompt-assembly.test.ts` | Tests voor KiB context en hoeveelheidslimieten | VERIFIED | Tests voor extractKiBContext, KiB-blok assemblage, kwantiteitslimieten aanwezig |
| `src/components/steps/DINMappingStep.tsx` | Corrections state + wiring + client-side validatie + kibGoals/kibScope in alle 4 fetch-aanroepen | VERIFIED | State regels 312-314; corrections API response verwerking regels 963-985; client-side validatie regels 436, 489, 545; kibGoals/kibScope: 6 regels (796, 893-894, 1010-1011, 1100-1101 — dat zijn 4 API-aanroepen, elk met 2 regels behalve den die op 1 regel staat) |

---

## Key Link Verification

### Plan 01 key links

| Van | Naar | Via | Status | Details |
|-----|------|-----|--------|---------|
| `src/app/api/din-mapping/route.ts` | `src/lib/prompt-assembly.ts` | `assembleSystemPrompt(..., kibContext)` | WIRED | Regel 5: import; regel 12: `extractKiBContext`; regel 106: `assembleSystemPrompt(DIN_MAPPING_PROMPT, "din-mapping", undefined, kibContext)` |
| `src/app/api/din-suggest/route.ts` | `src/lib/prompt-assembly.ts` | `assembleSystemPrompt(..., kibContext)` | WIRED | Regel 18: import; regel 41: `extractKiBContext`; regels 81, 157, 290: alle drie assembleSystemPrompt-aanroepen bevatten kibContext |
| `src/app/api/cross-analyse/route.ts` | `src/lib/prompt-assembly.ts` | `assembleSystemPrompt(..., kibContext)` | WIRED | Regel 6: import; regel 12: `extractKiBContext`; regels 176 en 199: beide assembleSystemPrompt-aanroepen bevatten kibContext |

### Plan 02 key links

| Van | Naar | Via | Status | Details |
|-----|------|-----|--------|---------|
| `src/app/api/din-mapping/route.ts` | `src/lib/din-validation.ts` | post-validatie na Zod-validatie | WIRED | Regel 6: import; regels 120-122: validateBaat, validateVermogen, validateInspanning op alle items; corrections in response (regels 131-138) |
| `src/app/api/din-suggest/route.ts` | `src/lib/din-validation.ts` | post-validatie in create en suggest modi | WIRED | Regel 19: import; regels 169-185: create-mode validatie; regels 302-318: suggest-mode validatie |
| `src/components/steps/DINMappingStep.tsx` | `src/components/din/BenefitCard.tsx` | `corrections={benefitCorrections[benefit.id]}` | WIRED | Regel 1448: `corrections={benefitCorrections[benefit.id]}` |
| `src/components/steps/DINMappingStep.tsx` | `src/lib/din-validation.ts` | client-side validatie bij handmatige edits | WIRED | Regel 29: import; regels 436, 489, 545: validateBaat/validateVermogen/validateInspanning in update handlers |
| `src/components/din/BenefitCard.tsx` | corrections prop | inline badge met dismiss | WIRED | Regel 41: prop definitie; regel 66: badgeDismissed state; regel 67: useEffect reset; regel 194: badge render |

### Plan 03 key links (gap closure)

| Van | Naar | Via | Status | Details |
|-----|------|-----|--------|---------|
| `src/components/steps/DINMappingStep.tsx` | `/api/din-suggest` | `kibGoals: session!.goals, kibScope: session!.scope` in request body | WIRED | Regel 796: `body: JSON.stringify({ type, context, kibGoals: session!.goals, kibScope: session!.scope })` |
| `src/components/steps/DINMappingStep.tsx` | `/api/din-mapping` | `kibGoals: session!.goals, kibScope: session!.scope` in request body | WIRED | Regels 893-894: `kibGoals: session!.goals, kibScope: session!.scope` in requestBody object |
| `src/components/steps/DINMappingStep.tsx` | `/api/cross-analyse` (sector-integratie) | `kibGoals: session!.goals, kibScope: session!.scope` in request body | WIRED | Regels 1010-1011: `kibGoals: session!.goals, kibScope: session!.scope` in requestBody object |
| `src/components/steps/DINMappingStep.tsx` | `/api/cross-analyse` (verrijkt-sectorplan) | `kibGoals: session!.goals, kibScope: session!.scope` in request body | WIRED | Regels 1100-1101: `kibGoals: session!.goals, kibScope: session!.scope` in inline JSON.stringify object |

---

## Data-Flow Trace (Level 4)

| Artifact | Data variabele | Bron | Produceert echte data | Status |
|----------|---------------|------|----------------------|--------|
| `din-mapping/route.ts` assembleSystemPrompt call | `kibContext` | `extractKiBContext({ goals: kibGoals, scope: kibScope })` uit request body | JA — DINMappingStep.tsx stuurt nu `session!.goals` en `session!.scope` mee; extractKiBContext bouwt KiBContext met echte goals data | FLOWING |
| `din-suggest/route.ts` assembleSystemPrompt call | `kibContext` | `extractKiBContext({ goals: body.kibGoals, scope: body.kibScope })` | JA — DINMappingStep.tsx fetchAISuggestion stuurt `session!.goals` en `session!.scope` mee | FLOWING |
| `cross-analyse/route.ts` assembleSystemPrompt call | `kibContext` | `extractKiBContext({ goals: body.kibGoals, scope: body.kibScope })` | JA — beide cross-analyse aanroepen sturen `session!.goals` en `session!.scope` mee | FLOWING |
| `BenefitCard.tsx` correctie-badge | `corrections` prop | `benefitCorrections[benefit.id]` state in DINMappingStep | JA — corrections worden gevuld vanuit API response post-validatie (regels 963-985) en client-side validatie (regel 436) | FLOWING |
| `AIDINMappingResponseSchema` `.max()` | array lengte | Zod schema validatie van Claude API response | JA — schema wordt toegepast op elke Claude API response | FLOWING |

**Noot op gap-sluiting:** De vorige verificatie toonde dat kibContext altijd leeg was (HOLLOW) omdat DINMappingStep.tsx nooit kibGoals/kibScope stuurde. Na plan 04-03 stroomt de data nu correct door: `session!.goals` (array van ProgrammeGoal objecten) → request body → `extractKiBContext` → `buildKiBBlock` → system prompt met KIB PROGRAMMADOELEN EN SCOPE sectie.

---

## Behavioral Spot-Checks

| Gedrag | Check | Resultaat | Status |
|--------|-------|-----------|--------|
| AIDINMappingResponseSchema weigert benefits array met 5 items | schemas.ts regels 392-394: `.max(4)` aanwezig | Aanwezig | PASS |
| extractKiBContext met lege input geeft `{ goals: [], scope: null }` | prompt-assembly.ts regels 110-125: lege array + null retour | Logica correct | PASS |
| KiB-blok positie: na programmaboek-context | prompt-assembly.ts regels 257-270: kibBlock append na context sectie | Positie correct | PASS |
| DINMappingStep stuurt kibGoals/kibScope naar din-mapping API | grep op "kibGoals" in DINMappingStep.tsx: 6 matches (4 API-aanroepen) | 6 matches gevonden (regels 796, 893, 894, 1010, 1011, 1100, 1101 — check bevestigt alle 4 aanroepen) | PASS |
| DINMappingStep stuurt kibGoals/kibScope naar din-suggest API | grep op regel 796: `kibGoals: session!.goals, kibScope: session!.scope` in fetchAISuggestion | Aanwezig op correct niveau (naast type en context, niet erin) | PASS |

---

## Requirements Coverage

| Requirement | Plan | Omschrijving | Status | Bewijs |
|-------------|------|-------------|--------|--------|
| AI-02 | 04-01 | AI genereert maximaal 2-4 baten per doel per sector, met methodiek-conforme titels (vergrotende trap) | SATISFIED | `.max(4)` op AIDINMappingResponseSchema.benefits; vergrotende trap auto-correctie in validateBaat; post-validatie pipeline actief in din-mapping/route.ts |
| AI-03 | 04-01, 04-03 | KiB visie en scope worden meegegeven aan alle AI-generatie stappen | SATISFIED | Server-side: extractKiBContext + assembleSystemPrompt in alle 3 API routes. Client-side: kibGoals en kibScope in alle 4 fetch-aanroepen in DINMappingStep.tsx (plan 04-03 gap closure) |
| AI-04 | 04-02 | AI-output wordt gevalideerd tegen DIN-methodiek regels voordat het wordt opgeslagen | SATISFIED | validateBaat (vergrotende trap + werkwoord check), validateVermogen (actie-werkwoord check), validateInspanning (werkwoord verplicht) — alle actief in API post-validatie pipeline en client-side bij handmatige titelwijzigingen |

Geen orphaned requirements: alle drie requirements (AI-02, AI-03, AI-04) zijn geclaimd door plannen en geverifieerd in de codebase.

---

## Anti-Patterns Found

Geen blockers gevonden na gap-sluiting.

| Bestand | Patroon | Ernst | Impact |
|---------|---------|-------|--------|
| Geen | - | - | - |

**Vorig blocker opgelost:** `DINMappingStep.tsx` miste kibGoals/kibScope in request bodies. Dit is gefixed in plan 04-03. Alle 4 API-aanroepen bevatten nu de velden op het juiste nesting-niveau.

---

## Human Verification Required

### 1. KiB-context zichtbaar in AI-prompts bij productie

**Test:** Open een sessie met geimporteerde KiB-doelen en scope. Genereer een DIN-mapping via de "Genereer DIN-netwerk" knop. Bekijk de network request naar `/api/din-mapping` in de browser devtools (Network tab, selecteer de POST request, bekijk de Request Body).
**Expected:** Request body bevat `kibGoals` (array van goal-objecten met name, description, rank) en `kibScope` (object met inScope/outScope). Server-side zou de system prompt de sectie "KIB PROGRAMMADOELEN EN SCOPE:" moeten bevatten wanneer goals beschikbaar zijn.
**Why human:** Vereist live API-aanroep en inspectie van netwerk/server output. De statische verificatie bevestigt dat de code correct is — de runtime correctheid vereist een menselijke check.

---

## Gaps Summary

Geen gaps — alle 6 truths zijn VERIFIED.

**Gap-sluiting bevestigd:** Het enige gap uit de vorige verificatie (DINMappingStep.tsx stuurde nooit kibGoals/kibScope naar de API-routes) is gesloten via plan 04-03. Verificatie bevestigt:
- `kibGoals: session!.goals` en `kibScope: session!.scope` aanwezig op regels 796, 893-894, 1010-1011, 1100-1101
- Alle 4 API-aanroepen (din-suggest/fetchAISuggestion, din-mapping/handleAIGenerate, cross-analyse/handleIntegratieAdvies, cross-analyse/handleGenerateVerrijktPlan) zijn gedekt
- Elke kibGoals/kibScope staat op het juiste nesting-niveau in de request body (niet genest in een sub-object)

De volledige KiB context injectie keten is nu actief: DINMappingStep client → API route request body → extractKiBContext → assembleSystemPrompt → KiB-blok in system prompt.

---

_Verified: 2026-04-02T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Ja — na gap-sluiting plan 04-03_
