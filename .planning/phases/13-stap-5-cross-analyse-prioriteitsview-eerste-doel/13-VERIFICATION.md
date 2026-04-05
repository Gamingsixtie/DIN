---
phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
verified: 2026-04-05T23:40:00Z
status: passed
score: 7/7 must-haves verified
---

# Phase 13: Stap 5 Cross-Analyse Prioriteitsview eerste doel — Verification Report

**Phase Goal:** Herschrijf stap 5 van de cross-analyse wizard naar een focusview rond het eerste doel (hoogste rank). Toon alleen: (1) het focusdoel, (2) de daaraan gekoppelde baten per sector, (3) de geconsolideerde cross-sector vermogens die hefboom leveren op die baten, (4) de bijbehorende gedeelde inspanningen. Voeg AI-review toe die beoordeelt of inspanningen breed genoeg zijn voor de nu cross-sector vermogens (verbredings-suggesties) en of de baten daadwerkelijk worden geraakt (risico-detectie). Verwijder het huidige totaaloverzicht uit stap 5. Niet-geconsolideerde items komen in een inklapbare "buiten scope" sectie.

**Verified:** 2026-04-05T23:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Stap 5 toont focusview rond het eerste doel (hoogste rank) via pure filter-semantiek | VERIFIED | `src/lib/stap5-focus.ts` `getFocusGoal` (L16-19) uses D-01 locked expression `[...goals].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))[0]`. `computeFocusView` (L35-97) implements 8-step filter. Aangeroepen in zowel `StapSectorVertaling.tsx` (L38) als API route (L139). |
| 2 | Stap5ResultSchema heeft de nieuwe shape (focusDoelId, vermogenReview, inspanningReview, batenDekking, samenvatting); oude sectorVertalingen[] shape is weg | VERIFIED | `src/lib/schemas.ts` L433-455 bevat exact de nieuwe shape. `grep sectorVertalingen src/` → alleen matches in test files die de rejection verifiëren. |
| 3 | AI-prompt instrueert Claude op hefboomwerking, breedte (Nederlandse enum), baten-dekking en samenvatting | VERIFIED | `src/lib/prompts.ts` L253 `CROSS_ANALYSE_STAP5_PROMPT` verwijst naar "Werken aan Programma's, Hfst 8 — Hefboomwerking". L264 "HEFBOOMWERKING PER VERMOGEN", L271-273 alle 3 Nederlandse enums (dekt_volledig, moet_verbreed, mist_aspect). L304 batenDekking, L313 samenvatting. |
| 4 | API route stap===5 stuurt versmalde payload (focusdoel + baten + cross-sector vermogens + gedeelde inspanningen) met dezelfde filter-semantiek als client | VERIFIED | `src/app/api/cross-analyse/route.ts` L21 importeert `getFocusGoal`. L136 `let payloadForPrompt: unknown = structuredData`. L137 `if (stap === 5)`. L139 roept `getFocusGoal(rawGoals)` aan (dezelfde helper als client). L145-176 filter keten identiek aan `computeFocusView`. L197 `JSON.stringify(payloadForPrompt, ...)` vervangt `structuredData` in stap-branch. |
| 5 | StapSectorVertaling.tsx rendert focusview met 6 blokken (focusdoel, baten per sector, cross-sector vermogens, gedeelde inspanningen, AI-samenvatting, buiten-scope footer); oude totaaloverzicht weg | VERIFIED | `src/components/cross-analyse/StapSectorVertaling.tsx` (364 lines) bevat alle 6 blokken (L66 Block 1 FocusDoelCard, L79 Block 2 BatenPerSectorGroup, L145 Block 3 CrossSectorVermogensList, L202 Block 4 GedeeldeInspanningenList, L308 Block 6 BuitenScopeFooter). Intro L58-64. `grep findGaps\|getDomainBalance\|DOMAIN_LABELS\|EffortDomain` → 0 matches. |
| 6 | CrossAnalyseWizard restore guard valideert stap5 shape via restoreStap5Result; STEP_INFO[5] bevat UI-SPEC copy; CTA zichtbaar op stap 5 | VERIFIED | `src/components/cross-analyse/CrossAnalyseWizard.tsx` L14 `import { restoreStap5Result } from "@/lib/stap5-focus"`. L77 `title: "Prioriteitsview — eerste doel"`. L80 `analyseLabel: "Analyseer eerste doel"`. L81 `loadingTitle: "AI beoordeelt hefboomwerking…"`. L105 `restoredStap5 = restoreStap5Result(wizData.stepResults?.stap5)`. L444 `wizardState.currentStep <= 5`. `grep currentStep <= 4` → 0 matches. |
| 7 | Wave 0 regression tests (23) en productiebuild slagen | VERIFIED | `npx vitest run src/lib/__tests__/schemas-stap5.test.ts src/lib/__tests__/stap5-focus-filter.test.ts src/lib/__tests__/stap5-restore-guard.test.ts` → 23/23 passed (5 + 11 + 7). `npm run build` → Compiled successfully in 4.2s, 13/13 static pages generated. |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/stap5-focus.ts` | Pure helpers getFocusGoal, computeFocusView, restoreStap5Result | VERIFIED | 115 lines (matches plan 13-02 claim). Exports alle 3 helpers + FocusView interface. Geen `any`. Importeert `Stap5ResultSchema` voor safeParse (L1, L106). D-01 locked expression correct (L18). |
| `src/lib/schemas.ts` | Nieuwe Stap5ResultSchema (focusDoelId + vermogenReview + inspanningReview + batenDekking + samenvatting) | VERIFIED | L433-455 bevat exact de nieuwe shape. Oude shape volledig vervangen. Default `[]` op de 3 review-arrays voorkomt parse failures. |
| `src/lib/prompts.ts` | Nieuwe CROSS_ANALYSE_STAP5_PROMPT met hefboomwerking, breedte-enum, baten-dekking, samenvatting | VERIFIED | L253 begint. Instrueert op 4 beoordelingspunten. JSON-schema contract expliciet in prompt (L287-313). Nederlandse enum exact: dekt_volledig, moet_verbreed, mist_aspect. |
| `src/app/api/cross-analyse/route.ts` | Stap 5 payload narrowing via getFocusGoal + focus-scope filters | VERIFIED | 260 lines. L21 import, L136-192 narrowing block, L197 payloadForPrompt in userMessage. Stap 1-4 branches ongewijzigd. |
| `src/components/cross-analyse/StapSectorVertaling.tsx` | Focusview rewrite met 6 blokken; geen oude totaaloverzicht | VERIFIED | 364 lines. 6 blokken aanwezig. Geen findGaps/getDomainBalance/DOMAIN_LABELS imports. SECTORS_ORDER = ["PO", "VO", "Zakelijk"] hardcoded (L21). Border-l-4 met correct accent per keten-niveau. |
| `src/components/cross-analyse/CrossAnalyseWizard.tsx` | Restore guard + STEP_INFO[5] copy + CTA condition <= 5 | VERIFIED | 479 lines. L14 import, L77-82 STEP_INFO[5] volledig ingevuld, L105 restoreStap5Result call, L444 currentStep <= 5. |
| `src/lib/__tests__/schemas-stap5.test.ts` | 5 regression tests voor Stap5ResultSchema | VERIFIED | 5/5 tests GREEN. |
| `src/lib/__tests__/stap5-focus-filter.test.ts` | 11 unit tests voor getFocusGoal + computeFocusView | VERIFIED | 11/11 tests GREEN. |
| `src/lib/__tests__/stap5-restore-guard.test.ts` | 7 tests voor restoreStap5Result pure function | VERIFIED | 7/7 tests GREEN. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `StapSectorVertaling.tsx` | `src/lib/stap5-focus.ts computeFocusView` | import + call op session prop | WIRED | L5 `import { computeFocusView } from "@/lib/stap5-focus"`, L38 `const view = computeFocusView(session)`. |
| `api/cross-analyse/route.ts` | `src/lib/stap5-focus.ts getFocusGoal` | import + call op body.goals voor stap===5 branch | WIRED | L21 import, L139 `const focusGoal = getFocusGoal(rawGoals)` within `if (stap === 5)` block. Zelfde helper als client → identieke filter-semantiek (D-01 + D-09). |
| `CrossAnalyseWizard.tsx useEffect` | `src/lib/stap5-focus.ts restoreStap5Result` | validate stap5 shape bij session load | WIRED | L14 import, L105 `const restoredStap5 = restoreStap5Result(wizData.stepResults?.stap5)`, resultaat gespread in stepResults. |
| `StapSectorVertaling.tsx` | `result.batenDekking / vermogenReview / inspanningReview` | find by id voor AI callouts | WIRED | L101 `result?.batenDekking.find((d) => d.baatId === baat.id)`, L160 `result?.vermogenReview.find(...)`, L216 `result?.inspanningReview.find(...)`. Optional chaining → werkt ook zonder AI-resultaat. |
| `StapSectorVertaling.tsx` | `SectorBadge` from `./shared` | relative import | WIRED | L4 `import { SectorBadge } from "./shared"`. Meerdere usages: L91, L172, L248, L337, L350. |
| `src/lib/stap5-focus.ts restoreStap5Result` | `Stap5ResultSchema.safeParse` | D-10 migration guard | WIRED | L1 import Stap5ResultSchema, L106 `const parsed = Stap5ResultSchema.safeParse(rawStap5)`, L108 console.warn on rejection. |

**All 6 key links verified as WIRED.**

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `StapSectorVertaling.tsx` | `view` (focusGoal, focusBenefits, focusCaps, focusEfforts, outOfScope) | `computeFocusView(session)` → filtert session.goals, session.benefits, session.capabilities, session.efforts (echte session data uit `useSession()` context) | Yes — filtert echte session state, niet hardcoded | FLOWING |
| `StapSectorVertaling.tsx` | `result` prop (batenDekking, vermogenReview, inspanningReview) | Parent wizard `wizardState.stepResults.stap5` — gevuld door `handleAnalyse` POST `/api/cross-analyse` met stap: 5 (AI call naar Claude) | Yes — `api/cross-analyse/route.ts` stuurt focus-scoped payload en retourneert gevalideerd Stap5ResultSchema | FLOWING |
| `api/cross-analyse/route.ts` stap 5 branch | `payloadForPrompt` | `structuredData` (body request) → filtered door focusBenefitIds/focusCapIds/focusEffortIds | Yes — gebruikt echte request body data, niet hardcoded | FLOWING |
| `CrossAnalyseWizard.tsx` | `wizardState.stepResults.stap5` | localStorage restore via `restoreStap5Result(wizData.stepResults?.stap5)` → bij nieuwe analyse via handleAnalyse API response | Yes — persistence-first pattern, real localStorage data | FLOWING |

All data-flow paths use real session/API data. No hardcoded empty values, no mock stubs.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Wave 0 regression tests pass | `npx vitest run src/lib/__tests__/schemas-stap5.test.ts src/lib/__tests__/stap5-focus-filter.test.ts src/lib/__tests__/stap5-restore-guard.test.ts` | Test Files 3 passed (3), Tests 23 passed (23), Duration 209ms | PASS |
| Production build succeeds | `npm run build` | Compiled successfully in 4.2s; 13/13 static pages generated; `/api/cross-analyse` route present | PASS |
| Schema replaced (no legacy refs in src) | `grep sectorVertalingen` in `src/` (excluding tests) | 0 matches in production code; only in test files verifying rejection | PASS |
| CTA condition extended | `grep 'currentStep <= 4'` in `CrossAnalyseWizard.tsx` | 0 matches (was 1 before phase 13) | PASS |
| Required copy strings present | `grep 'Prioriteitsview — eerste doel'` in `CrossAnalyseWizard.tsx` | 1 match (STEP_INFO[5].title L77) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| R-CROSS-01 | 13-01, 13-02, 13-03, 13-04 | Cross-analyse prioriteitsview (tracked out of band — added as Phase 11+13 extension after v1 REQUIREMENTS.md) | SATISFIED | Focusview rond focusdoel (laagste rank) implementeert prioriteitsgerichte cross-analyse. `computeFocusView` filtert op semantische relaties (goalBenefitMaps, benefitCapabilityMaps, capabilityEffortMaps). AI-prompt beoordeelt hefboomwerking en baten-dekking. |
| R-CROSS-02 | 13-01, 13-02, 13-03, 13-04 | Synergie-matrix / cross-sector vermogens identificatie (tracked out of band) | SATISFIED | Cross-sector vermogens gefilterd op `relatedSectors.length > 1` (stap5-focus.ts L51-53). Gedeelde inspanningen gefilterd op `responsibleSector.includes(",")` (L70-72). UI toont per item welke sectoren betrokken zijn via `SectorBadge` per `relatedSectors`/`responsibleSector` split. AI-review beoordeelt of inspanningen breed genoeg zijn voor de nu cross-sector vermogens. |

**Note on requirement tracking:** R-CROSS-01 and R-CROSS-02 do not appear in the v1 `.planning/REQUIREMENTS.md` table (which contains CROSS-01..CROSS-04 as complete). These IDs are post-v1 additions declared in the ROADMAP.md Phase 13 entry. They are tracked out of band as a Phase 11+13 extension, consistent with CONTEXT.md locked decisions. No orphaned requirements detected for Phase 13.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No anti-patterns detected in phase 13 files | — | — |

Scan results:
- No `TODO/FIXME/XXX/HACK/PLACEHOLDER` in phase 13 modified files
- No `return null` / `return <></>` in StapSectorVertaling except legitimate early-return for TypeScript narrowing (L41, after empty state A already rendered — unreachable in practice)
- No empty handlers / placeholder strings leaking to user
- Hardcoded `SECTORS_ORDER = ["PO", "VO", "Zakelijk"]` (L21) is a **legitimate domain constant**, not a stub (matches CLAUDE.md Sector schema)
- `result?.batenDekking.find(...)` with optional chaining is **intentional** — structurele view rendert ook zonder AI-resultaat (truth #4)

### Human Verification Required

None. UAT was approved by user on 2026-04-05 (commit `1a722b1`) with 10-point checklist covering:
1. Focusdoel card met #003366 accent
2. Baten per sector (PO/VO/Zakelijk) met #0066cc accent
3. Cross-sector vermogens (relatedSectors.length > 1) met #0891b2 accent
4. Gedeelde inspanningen (responsibleSector komma) met #059669 accent
5. Empty states conform copy
6. AI Analyseer flow met badges en samenvatting
7. Buiten-scope footer inklapbaar
8. Page reload persistence via localStorage
9. Oude shape silent reset (D-10)
10. Styling conformance (neutrale achtergronden, linker accenten)

### Gaps Summary

**No gaps found.** Alle zeven observable truths zijn geverifieerd in de codebase. Alle kernbestanden bestaan, zijn substantieel, wired, en hun data flows real (niet hardcoded). Build slaagt. Wave 0 regression tests (23/23) slagen. Legacy `sectorVertalingen[]` shape is volledig verwijderd uit productiecode. UAT is door gebruiker approved.

**Scope boundary respected:** Pre-existing `src/lib/__tests__/schemas.test.ts:395` failure (DINSessionSchema strips integratieAdvies) is een Phase 09-01 follow-up en buiten scope voor Phase 13, zoals gedocumenteerd in `deferred-items.md`.

**Phase 13 is complete and ready for Phase 14.** Wave 1 foundation (schemas + prompt + pure helpers), Wave 2 implementation (API narrowing + component rewrite), Wave 3 wizard integration, en Wave 0 regression tests zijn allemaal gevalideerd tegen de codebase — niet alleen tegen SUMMARY claims.

---

*Verified: 2026-04-05T23:40:00Z*
*Verifier: Claude (gsd-verifier)*
