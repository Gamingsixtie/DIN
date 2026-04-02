---
phase: 06-cyclisch-doel-voor-doel-werken
verified: 2026-04-02T23:15:00Z
status: human_needed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Voer de cyclische goal-by-goal workflow end-to-end uit in de browser"
    expected: "Status badges tonen correct, 'Doel afronden' button werkt met completeness gate, auto-advance naar volgend doel, 'Markering opheffen' werkt, completedGoalItems zichtbaar in DevTools Network request body"
    why_human: "Interactief UI-gedrag, auto-advance timing (300ms setTimeout), React state-update volgorde na updateSession kan niet programmatisch worden geverifieerd"
  - test: "Verifieer dat de AI andere items genereert voor het tweede doel (deduplicatie)"
    expected: "Bij het genereren van DIN voor een tweede doel na het afronden van het eerste, bevat de AI-output geen duplicaten van de baten/vermogens/inspanningen van het eerste doel"
    why_human: "Vereist echte AI-aanroep en semantisch oordeel over de output — niet automatisch te toetsen"
---

# Phase 6: Cyclisch Doel-voor-Doel Werken — Verification Report

**Phase Goal:** Gebruiker werkt één doel tegelijk af met visuele voortgang en AI deduplicatie
**Verified:** 2026-04-02T23:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Gebruiker kan een specifiek doel selecteren en uitwerken over alle drie sectoren | VERIFIED | GoalStatusBadge en sidebar per-sector mini-indicators aanwezig in DINMappingStep.tsx:1372-1396 |
| 2 | Bij het uitwerken van volgend doel worden eerder uitgewerkte doelen als context meegegeven | VERIFIED | buildCompletedGoalsContext in prompt-assembly.ts:320-353, wired in alle 3 branches van din-suggest en in din-mapping, completedGoalItems doorgegeven via buildCompletedGoalItemsForAPI() |
| 3 | Gebruiker ziet per doel de voortgangsstatus: volledig uitgewerkt, deels uitgewerkt, of nog niet begonnen | VERIFIED | GoalStatusBadge component in DINMappingStep.tsx:1371-1396 — tri-state: afgerond (groen vinkje), bezig (PO+/VO-/Za- mini-indicators), niet-begonnen (grijs rondje) |
| 4 | Pas na het afronden van een doel wordt het volgende doel voorgesteld | VERIFIED | Auto-advance in DINMappingStep.tsx:1592-1601 via setTimeout(300ms) na updateSession met completedGoals; "Doel afronden" button disabled zolang completion.isComplete === false |

**Score:** 4/4 success criteria verified

### Must-Haves Verification (per plan frontmatter)

#### Plan 01 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | checkSectorChain bepaalt correcte DIN-keten per sector via mappings | VERIFIED | din-service.ts:667-720 — traverseert goalBenefitMaps -> benefitCapabilityMaps -> capabilityEffortMaps, 11/11 unit tests groen |
| 2 | getGoalCompletionStatus retourneert afgerond/bezig/niet-begonnen | VERIFIED | din-service.ts:728-768, alle 5 getGoalCompletionStatus tests groen |
| 3 | DINSession schema accepteert completedGoals met default [] | VERIFIED | schemas.ts:378: `completedGoals: z.array(z.string()).optional().default([])` |
| 4 | Doel zonder items geeft status niet-begonnen | VERIFIED | goal-completion.test.ts:161-171 — test slaagt |
| 5 | Doel met items in sommige sectoren geeft bezig met per-sector detail | VERIFIED | goal-completion.test.ts:173-186, sectorStatuses test:244-254 |

#### Plan 02 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | buildCompletedGoalsContext genereert prompt-blok met deduplicatie-instructie | VERIFIED | prompt-assembly.ts:320-353, bevat "Vermijd overlap en duplicatie" en "Genereer aanvullende, unieke baten/vermogens/inspanningen" |
| 2 | Prompt-blok bevat expliciete deduplicatie-instructie in het Nederlands | VERIFIED | prompt-assembly.ts:327-328, 9/9 prompt-assembly tests groen |
| 3 | Prompt-blok gecapped op 6000 tekens met schone regelgrens-afkapping | VERIFIED | prompt-assembly.ts:345-350, COMPLETED_GOALS_MAX_CHARS = 6000, truncation test slaagt |
| 4 | din-mapping API route accepteert completedGoalItems in request body | VERIFIED | din-mapping/route.ts:13 — destructuring, :78-80 — appended to systemPrompt |
| 5 | din-suggest API route accepteert completedGoalItems in alle 3 branches | VERIFIED | din-suggest/route.ts:87-90 (domain-recommend), :173-176 (create), :316-319 (suggest) |
| 6 | Lege completedGoalItems produceert geen extra context-blok | VERIFIED | prompt-assembly.ts:323: `if (completedGoals.length === 0) return ""` |

#### Plan 03 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Gebruiker ziet per-doel status badges in de sidebar | VERIFIED | DINMappingStep.tsx:1371-1396 — GoalStatusBadge component aanwezig, 3 states geimplementeerd |
| 2 | Gebruiker kan 'Doel afronden' klikken wanneer alle 3 sectoren complete DIN-ketens hebben | VERIFIED | DINMappingStep.tsx:1582: `const canComplete = completion.isComplete && !isGenerating` |
| 3 | 'Doel afronden' button disabled met missing-chain tekst wanneer keten incompleet | VERIFIED | DINMappingStep.tsx:1603, 1612-1617 — disabled prop + allMissing weergave |
| 4 | Auto-advance naar volgend incomplete doel na klikken | VERIFIED | DINMappingStep.tsx:1592-1601 — setTimeout(300ms) met find() voor volgend niet-afgerond doel |
| 5 | completedGoalItems gestuurd naar API routes in fetch body | VERIFIED | DINMappingStep.tsx:1116, 1017 — buildCompletedGoalItemsForAPI() in handleAIGenerate en alle din-suggest aanroepen |
| 6 | Gebruiker kan doel un-completen via 'Markering opheffen' | VERIFIED | DINMappingStep.tsx:1558-1568 — "Dit doel is afgerond" + "Markering opheffen" button aanwezig |
| 7 | Oude groene stip (hasBenefits) verwijderd | VERIFIED | Grep op `u25CF` in DINMappingStep.tsx geeft geen resultaat — volledig vervangen |

**Score:** 7/7 must-have clusters verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/schemas.ts` | completedGoals field op DINSessionSchema | VERIFIED | Regel 378: `completedGoals: z.array(z.string()).optional().default([])` |
| `src/lib/din-service.ts` | checkSectorChain, getGoalCompletionStatus, types | VERIFIED | Regels 644-768 — alle exports aanwezig en substantieel |
| `src/lib/__tests__/goal-completion.test.ts` | Unit tests voor compleetheidslogica | VERIFIED | 256 regels, 11 test cases — alle groen |
| `src/lib/prompt-assembly.ts` | buildCompletedGoalsContext, CompletedGoalItem, CompletedGoalContext | VERIFIED | Regels 309-354 — alle exports aanwezig met volledige implementatie |
| `src/lib/__tests__/prompt-assembly.test.ts` | Tests voor buildCompletedGoalsContext | VERIFIED | describe("buildCompletedGoalsContext") aanwezig met 9 test cases |
| `src/app/api/din-mapping/route.ts` | completedGoalItems parameter handling | VERIFIED | Regel 13 (destructuring) + 78-80 (systemPrompt append) |
| `src/app/api/din-suggest/route.ts` | completedGoalItems in alle 3 branches | VERIFIED | Regels 87-90, 173-176, 316-319 |
| `src/components/steps/DINMappingStep.tsx` | GoalStatusBadge, DoelAfrondenButton, auto-advance, completedGoalItems | VERIFIED | Regels 1372-1619 — alle onderdelen aanwezig |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| din-service.ts | types.ts | DINSession type import | VERIFIED | Bestaande import, completedGoals veld auto-derived via schema |
| goal-completion.test.ts | din-service.ts | import checkSectorChain | VERIFIED | Regels 3-10 van testbestand |
| din-mapping/route.ts | prompt-assembly.ts | import buildCompletedGoalsContext | VERIFIED | Regel 5: `buildCompletedGoalsContext` in import |
| din-suggest/route.ts | prompt-assembly.ts | import buildCompletedGoalsContext | VERIFIED | Regel 18: `buildCompletedGoalsContext` in import |
| DINMappingStep.tsx | din-service.ts | import getGoalCompletionStatus | VERIFIED | Regels 26-27: `getGoalCompletionStatus` + types |
| DINMappingStep.tsx | /api/din-mapping | fetch met completedGoalItems | VERIFIED | Regel 1116: `completedGoalItems: buildCompletedGoalItemsForAPI()` |
| DINMappingStep.tsx | session-context.tsx | updateSession voor completedGoals | VERIFIED | Regels 1561-1563, 1589-1591: functionele updaters voor completedGoals |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| GoalStatusBadge | completion (GoalCompletionStatus) | getGoalCompletionStatus(session, goalId) — leest session.goalBenefitMaps, benefitCapabilityMaps, capabilityEffortMaps | Ja — traverseert echte mapping-keten, geen hardcoded waarden | FLOWING |
| DoelAfrondenButton | completion.isComplete | Zelfde als hierboven | Ja | FLOWING |
| buildCompletedGoalItemsForAPI() | completedGoalIds | session.completedGoals (useState via useSession) | Ja — leest echte session state, filtert op gemapte baten/vermogens/inspanningen | FLOWING |
| systemPrompt (din-mapping) | completedGoalItems | request body van frontend | Ja — conditionally appended via buildCompletedGoalsContext | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| npm run build slaagt | `npm run build` | 11/11 routes gebouwd, geen TypeScript fouten | PASS |
| 11 goal-completion tests slagen | `npx vitest run goal-completion.test.ts` | 11/11 PASS | PASS |
| 9 prompt-assembly buildCompletedGoalsContext tests | `npx vitest run prompt-assembly.test.ts` | 56/56 PASS (inclusief 9 nieuwe) | PASS |
| Totale test suite geen regressies | `npx vitest run` | 474/474 PASS | PASS |
| Oude groene stip verwijderd | grep `u25CF` in DINMappingStep.tsx | Geen matches | PASS |
| completedGoalItems aanwezig in alle fetch calls | grep in DINMappingStep.tsx | 2 locaties gevonden (din-mapping + din-suggest) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CYCL-01 | 06-01, 06-03 | Gebruiker werkt één doel volledig uit voordat het volgende begint | SATISFIED | completedGoals schema, checkSectorChain, GoalStatusBadge, DoelAfrondenButton met completeness gate |
| CYCL-02 | 06-02, 06-03 | Context van eerder uitgewerkte doelen meegegeven bij volgende doelen | SATISFIED | buildCompletedGoalsContext, API route wiring, completedGoalItems passthrough in alle fetch calls |
| CYCL-03 | 06-01, 06-03 | Voortgangsindicatie per doel | SATISFIED | GoalStatusBadge met tri-state (afgerond/bezig/niet-begonnen), per-sector mini-indicators voor bezig |

Alle drie CYCL-requirements zijn gedekt. Geen orphaned requirements voor Phase 6.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| DINMappingStep.tsx | 1596 | Auto-advance leest `session!.completedGoals` in setTimeout callback — stale closure risico | Info | De callback leest de state vóór updateSession. Dit is acceptabel: de net-afgeronde goal wordt via `g.id !== selectedGoal` uitgesloten, niet via completedGoals. Zie plan-commentaar op regel 1596. |

Geen blocker of warning anti-patronen gevonden. Het stale-closure gedrag op de auto-advance is by design (plan 03 documenteert dit expliciet) en werkt correct.

### Human Verification Required

#### 1. Cyclische workflow end-to-end in de browser

**Test:** `npm run dev`, open een sessie met geïmporteerde doelen, ga naar DIN-mapping stap
1. Verifieer dat doelen grijs rondje tonen (niet-begonnen)
2. Genereer DIN voor één doel in één sector — verifieer PO+/VO-/Za- mini-indicators
3. Verifieer dat "Doel afronden" button grijs/disabled is zolang niet alle 3 sectoren compleet zijn
4. Compleet alle 3 sectoren — verifieer dat button groen wordt
5. Klik "Doel afronden" — verifieer groen vinkje op het doel, auto-advance naar volgend doel
6. Klik op afgerond doel — verifieer "Dit doel is afgerond" + "Markering opheffen"
7. Klik "Markering opheffen" — verifieer dat het vinkje verdwijnt
8. Verifieer in DevTools Network tab dat request body `completedGoalItems` bevat

**Expected:** Alle bovenstaande UI-interacties werken correct
**Why human:** Interactief UI-gedrag, React state-timing na async updateSession, visuele correctheid van badges kunnen niet programmatisch worden geverifieerd

#### 2. AI deduplicatie werkt voor tweede doel

**Test:** Rond goal 1 af, genereer DIN voor goal 2
**Expected:** AI-output voor goal 2 bevat geen duplicaten van baten/vermogens/inspanningen van goal 1
**Why human:** Vereist echte AI-aanroep en semantisch oordeel over de output

### Gaps Summary

Geen gaps gevonden. Alle must-haves zijn verified op alle niveaus (exists, substantive, wired, data-flowing). De twee human-verification items zijn behavioral/visueel van aard en kunnen niet programmatisch worden geverifieerd — ze vormen geen blocker voor de goal-achievement assessment.

---

_Verified: 2026-04-02T23:15:00Z_
_Verifier: Claude (gsd-verifier)_
