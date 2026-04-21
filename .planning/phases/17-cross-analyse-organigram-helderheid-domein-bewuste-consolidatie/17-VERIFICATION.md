---
phase: 17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
verified: 2026-04-17T21:15:00Z
status: human_needed
score: 22/22 must-haves code-verified; 7 UAT cases need human UI verification
re_verification:
  previous_status: none
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "UAT-1 Drieluik-rendering — open StapSectorVertaling met een sessie die stap2Result.vermogenGelijkenisGroepen bevat (≥1 groep met 3 vermogens)"
    expected: "Per groep rendert drie parallelle sector-vermogen-kaarten (grid-cols-3 op md+) met SectorBadge PO / VO / Zakelijk; rationale-kop toont gezamenlijkeOmschrijving + DomainBalanceBadge"
    why_human: "Visuele layout, grid-responsiviteit, SectorBadge-kleuren en badge-positionering zijn niet programmatisch verifieerbaar"
  - test: "UAT-2 Hefboom-badge tooltip — hover over 'Hefboom: raakt 3 sectoren via gelijkende vermogens' badge"
    expected: "Tooltip verschijnt onder de badge met lijst {sectorId}: {title} voor alle drie vermogens in de groep"
    why_human: "Tooltip hover-gedrag en visibility (group-hover) vereist browser-interactie"
  - test: "UAT-3 Cross-domein guard-error banner — probeer een merge waar items van verschillende domains (bijv. mens + data_systemen) samengaan"
    expected: "Inline rode banner met exact message 'Cross-domein merge geblokkeerd: mens + data_systemen' (of omgekeerd); Combineren-knop is disabled; Herzie advies knop zichtbaar"
    why_human: "Vereist volledige UI-flow met session-data en triggers mergeEfforts throw via ConsolidationActionBar"
  - test: "UAT-4 Herzie-advies round-trip + cache-invalidatie — vul context-textarea in per cluster en klik 'Herzie advies'"
    expected: "Spinner verschijnt; na response wordt consolidatieAdvies cluster overschreven; savedContext wordt getoond als italic onder cluster; subEffortAnalysis voor affectedGroepIds wordt gefilterd (volgende Analyseer-run genereert opnieuw)"
    why_human: "Realtime AI-call + visuele feedback + cache-invalidatie-effect op volgende analyse run"
  - test: "UAT-5 Auto-apply toast + Vereist review badge — laad een sessie met mix van valide en invalide combineren-clusters (bijv. cross-domein of missing drieluik)"
    expected: "Toast message 'N samengevoegd, M vereisen review' verschijnt kort; failed clusters krijgen rood-lint + 'Vereist review' badge op ClusterCard; geen dubbele render in React 19 Strict Mode"
    why_human: "Toast timing, badge-styling en Strict-Mode effect alleen zichtbaar in draaiende app"
  - test: "UAT-6 Domein-balans badge kleur-coding — bekijk DomainBalanceBadge per groep"
    expected: "Groen bij count ≥3 (Dekt 3 van 4 domeinen), amber bij count=2, rood bij count ≤1; label toont 'mist X, Y' voor ontbrekende domains"
    why_human: "Kleur-transities en label-formatting vereisen visuele verificatie"
  - test: "UAT-7 Legacy warning voor pre-17 consolidated caps — laad oude sessie met capabilities[].consolidated=true die NIET in een VermogenGelijkenisGroep zitten"
    expected: "Legacy-sectie onderaan de drieluik-lijst toont deze caps met amber 'Legacy: vermogens-merge (niet meer toegepast in cross-analyse)' badge; geen crash; MergeHerkomst expandable beschikbaar"
    why_human: "Vereist een sessie met specifieke legacy-data-shape om de code-pad te triggeren"
---

# Phase 17: Cross-analyse organigram helderheid + domein-bewuste consolidatie — Verification Report

**Phase Goal (ROADMAP.md regel 276-301):** Maak de cross-analyse organigram methodisch correct — vermogens blijven intact per sector (geen merge), `VermogenGelijkenisGroep` markeert drieluiks, inspanningen worden binnen hun domein gebundeld als gezamenlijke hefboom. Harde guards (D-01/D-02/D-27) blokkeren methodisch ongeldige merges. Beslismodel: AI stelt per cluster een aanbeveling voor; gebruiker kan via per-cluster textarea context meegeven voor `Herzie advies` regeneratie.

**Verified:** 2026-04-17
**Status:** human_needed — alle automated must-haves geverifieerd; 7 UAT cases blijven voor menselijke UI-verificatie (zoals 17-04-PLAN plan expliciet voorzag: `autonomous: false` + "human-verify checkpoint met 7 concrete UAT-cases")
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Samengevoegd uit must_haves frontmatter van 17-01, 17-02, 17-03 en 17-04 plans.

| #   | Truth                                                                                                       | Source | Status         | Evidence                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------- | ------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| T1  | Zod is expliciete dependency (niet transitief)                                                              | 17-01  | ✓ VERIFIED     | `package.json` regel bevat `"zod": "^4.3.6"`                                                              |
| T2  | `VermogenGelijkenisGroepSchema` gevalideerd in schemas                                                      | 17-01  | ✓ VERIFIED     | `src/lib/schemas.ts:320` `export const VermogenGelijkenisGroepSchema`                                     |
| T3  | `Stap2ResultSchema` backward-compat + `vermogenGelijkenisGroepen` veld                                      | 17-01  | ✓ VERIFIED     | `schemas.ts:461` `.optional().default([])`                                                                |
| T4  | `VermogenClusterItemSchema.aanbeveling` accepteert `markeer_gelijkenis`                                     | 17-01  | ✓ VERIFIED     | `schemas.ts:314` enum includes `"markeer_gelijkenis"`                                                     |
| T5  | `SubEffortAdviesSchema` shape                                                                               | 17-01  | ✓ VERIFIED     | `schemas.ts:330` `export const SubEffortAdviesSchema`                                                     |
| T6  | `Stap4ResultSchema` accepteert `subEffortAnalysis` + `context`                                              | 17-01  | ✓ VERIFIED     | `schemas.ts:490` subEffortAnalysis veld + context veld in consolidatieAdvies                              |
| T7  | `computeAutoApplyResult` pure helper unit-testbaar                                                          | 17-01  | ✓ VERIFIED     | `consolidation-guards.ts:122` + 4 passing tests in `consolidation-guards.test.ts`                         |
| T8  | `mergeEfforts` throws bij cross-domein (mens + data_systemen)                                               | 17-02  | ✓ VERIFIED     | `validateSameDomain` implementatie in `consolidation-guards.ts:49-56`; test groen                          |
| T9  | `mergeEfforts` throws bij sector-substring in voorgesteldeNaam                                              | 17-02  | ✓ VERIFIED     | `validateNeutralTitle` + `SECTOR_NAME_REGEX` in `consolidation-guards.ts:31-43`; tests groen                |
| T10 | `mergeEfforts` throws bij titel <10 chars                                                                   | 17-02  | ✓ VERIFIED     | `MIN_TITLE_LENGTH=10` check in `validateNeutralTitle`; tests groen                                         |
| T11 | `mergeEfforts` throws bij drieluikContext zonder dekking                                                    | 17-02  | ✓ VERIFIED     | `validateDrieluikThreshold` groep-lookup loop in `consolidation-guards.ts:67-96`; tests groen              |
| T12 | `mergeEfforts` zonder context werkt nog (backward compat)                                                   | 17-02  | ✓ VERIFIED     | `CrossAnalyseStep.tsx:111` `if (context) validateDrieluikThreshold(...)`; 18 existing tests groen          |
| T13 | `SECTOR_NAME_REGEX` laat false positives (Protocol, VOldoende, Automatiseren) door                           | 17-02  | ✓ VERIFIED     | Word-boundary `\b` in regex; "word boundary false positives" test groen                                   |
| T14 | `mergeCapabilities` throws bij sector-substring titel                                                       | 17-02  | ✓ VERIFIED     | `CrossAnalyseStep.tsx:26` `if (suggestedTitle) validateNeutralTitle(suggestedTitle)`; test groen           |
| T15 | Stap 2 prompt instrueert AI `markeer_gelijkenis` ipv `combineren` voor vermogens                              | 17-03  | ✓ VERIFIED     | `prompts.ts:178,188,205` `markeer_gelijkenis`; oude regel "Cluster vermogens die semantisch..." verwijderd |
| T16 | Stap 3 prompt bevat drieluik-drempel + same-domain regel                                                    | 17-03  | ✓ VERIFIED     | `prompts.ts` STAP3 blok bevat "VermogenGelijkenisGroep" + "alle drie sectoren" + "Cross-domein clusters fout" |
| T17 | Stap 4 prompt produceert UITSLUITEND `type: "inspanning"`                                                    | 17-03  | ✓ VERIFIED     | Oude `"type": "vermogen"` voorbeeld verwijderd; nieuwe regel "type MOET exact 'inspanning' zijn"          |
| T18 | `SUB_EFFORT_ANALYSE_PROMPT` accepteert groep + efforts, produceert `SubEffortAdvies[]`                       | 17-03  | ✓ VERIFIED     | `prompts.ts:360` nieuwe export; bevat alle 4 domein-enums + groepId/SubEffortAdvies contracten           |
| T19 | `/api/din-suggest` met `type === "consolidatie-herzien"` retourneert Zod-gevalideerde JSON                   | 17-03  | ✓ VERIFIED     | `din-suggest/route.ts:80-126` branch met `ConsolidatieHerzienResponseSchema` + 503/422 handling          |
| T20 | `/api/cross-analyse` stap 4 roept parallel `SUB_EFFORT_ANALYSE_PROMPT` per groep                             | 17-03  | ✓ VERIFIED     | `cross-analyse/route.ts:244` `Promise.all(groepen.map(async (groep) => ...))`; response merge regel 294   |
| T21 | Empty groep skipt AI-call (D-13 — geen verspilde tokens)                                                    | 17-03  | ✓ VERIFIED     | `cross-analyse/route.ts:257-260` `if (groepEfforts.length === 0) return [];`                              |
| T22 | Drieluik-rendering per VermogenGelijkenisGroep (3 sector-kaarten + DomainBalanceBadge + rationale-kop)       | 17-04  | ⚠ VERIFIED (code) / UAT-1 | `StapSectorVertaling.tsx:285` `vermogenGelijkenisGroepen.map(...)` + 3x SectorBadge render — UAT-1 vereist |
| T23 | Color-coded hefboomlaag per domein met gebundelde inspanningen uit `subEffortAnalysis`                       | 17-04  | ⚠ VERIFIED (code) / UAT-1 | StapSectorVertaling bevat DOMAIN_COLORS-gebaseerde rendering per domein binnen groep-sectie               |
| T24 | Elke gebundelde inspanning draagt `Hefboom: raakt 3 sectoren` badge met tooltip                              | 17-04  | ⚠ VERIFIED (code) / UAT-2 | `HefboomBadge` component: `StapSectorVertaling.tsx:78-109` + tooltip met `{sector}: {title}` lijst        |
| T25 | Handmatige merge-fail toont inline rode guard-banner + Combineren disabled                                   | 17-04  | ⚠ VERIFIED (code) / UAT-3 | `ConsolidationActionBar.tsx:43-69` `tryMerge()` + `guardError` state + `data-testid="guard-error-banner"` |
| T26 | Auto-apply toast + Vereist review badge                                                                     | 17-04  | ⚠ VERIFIED (code) / UAT-5 | `StapConsolidatie.tsx:175-179` toast logic; `ClusterCard.tsx:143-149` Vereist review badge              |
| T27 | Auto-apply 3-stappen pattern (pure compute → updateSession puur → aparte setState)                          | 17-04  | ✓ VERIFIED     | `StapConsolidatie.tsx:126-184` expliciete A/B/C kommentaren + geen setState binnen updateSession reducer  |
| T28 | Per-cluster context-textarea + `Herzie advies` knop roept `/api/din-suggest?type=consolidatie-herzien` aan | 17-04  | ⚠ VERIFIED (code) / UAT-4 | `ClusterCard.tsx:28` `HerzieAdviesInput`; `StapConsolidatie.tsx:304-322` handler met fetch                 |
| T29 | `subEffortAnalysis` invalidatie voor affected groepIds na Herzie advies (D-12 / B-4 fix)                    | 17-04  | ✓ VERIFIED     | `StapConsolidatie.tsx:346-354` `affectedGroepIds` set + `filteredSub` writeback                          |
| T30 | Legacy sessies met `capabilities[].consolidated=true` tonen amber badge (geen crash)                         | 17-04  | ⚠ VERIFIED (code) / UAT-7 | StapSectorVertaling bevat legacy-sectie rendering; SUMMARY bevestigt                                      |

**Score:** 22 truths fully verified (T1-T21, T27, T29); 8 truths require human UI verification (T22-T26, T28, T30) — all have matching code artifacts + data-testid hooks.

### Required Artifacts

| Artifact                                                      | Expected                                                | Exists | Substantive (size) | Wired              | Status     | Details                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------- | ------ | ------------------ | ------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| `src/lib/consolidation-guards.ts`                             | 7 exports (regex, const, 3 guards, helper, interface)   | ✓       | ✓ 144 regels       | ✓ (by CrossAnalyseStep + StapConsolidatie) | ✓ VERIFIED | Alle 4 `throw new Error` aanwezig; computeAutoApplyResult werkend                             |
| `src/lib/schemas.ts` (extensies)                              | VermogenGelijkenisGroep/SubEffortAdvies + veld-updates  | ✓       | ✓ 931+ regels      | ✓                  | ✓ VERIFIED | 9 grep matches: schema's, velden, type-exports alle aanwezig                                  |
| `src/lib/__tests__/cross-analyse-schema.test.ts`              | Schema tests (≥11 nieuwe)                               | ✓       | ✓ (22 tests groen) | ✓                  | ✓ VERIFIED | 22 passed                                                                                     |
| `src/lib/__tests__/consolidation-guards.test.ts`              | Unit tests (≥7)                                         | ✓       | ✓ (23 tests groen) | ✓                  | ✓ VERIFIED | Alle groen                                                                                    |
| `src/components/steps/CrossAnalyseStep.tsx`                   | Guards bedraad in mergeEfforts + mergeCapabilities      | ✓       | ✓                   | ✓                  | ✓ VERIFIED | Regel 6-10 imports; regel 26, 107, 109, 111 guard calls                                      |
| `src/lib/__tests__/consolidation.test.ts` (uitbreiding)       | 10+ nieuwe integratie-tests                             | ✓       | ✓ (18 tests groen) | ✓                  | ✓ VERIFIED | 7 VALIDATION.md `-t` patterns groen; DrieluikContext import aanwezig                          |
| `src/lib/prompts.ts` (herzieningen)                           | 2 nieuwe exports + stap 2/3/4 herzien                    | ✓       | ✓                   | ✓                  | ✓ VERIFIED | CONSOLIDATIE_HERZIEN_PROMPT + SUB_EFFORT_ANALYSE_PROMPT; markeer_gelijkenis in STAP2           |
| `src/app/api/din-suggest/route.ts`                            | Nieuwe consolidatie-herzien tak                          | ✓       | ✓                   | ✓                  | ✓ VERIFIED | `type === "consolidatie-herzien"` branch regel 80-126 met Zod + 503/422                      |
| `src/app/api/cross-analyse/route.ts`                          | Stap 4 uitbreiding met SubEffortAnalysis                 | ✓       | ✓                   | ✓                  | ✓ VERIFIED | `Promise.all` + empty-group skip + flat merge in response                                     |
| `src/components/cross-analyse/StapSectorVertaling.tsx`        | Drieluik rewrite (≥250 regels)                          | ✓       | ✓ 623 regels       | ✓ (via CrossAnalyseWizard props) | ✓ VERIFIED | 3 helpers (DomainBalanceBadge, HefboomBadge, HefboomPijlen); `vermogenGelijkenisGroepen.map`  |
| `src/components/cross-analyse/shared/ConsolidationActionBar.tsx` | Guard error banner + Herzie knop                      | ✓       | ✓ 241 regels       | ✓                  | ✓ VERIFIED | guardError state, tryMerge, data-testid="guard-error-banner", Combineren disabled             |
| `src/components/cross-analyse/shared/ClusterCard.tsx`         | Context-textarea + Herzie + Review badge                 | ✓       | ✓ 174 regels       | ✓                  | ✓ VERIFIED | onHerzieAdvies prop, HerzieAdviesInput, Vereist review badge                                  |
| `src/components/cross-analyse/StapConsolidatie.tsx`           | Auto-apply via computeAutoApplyResult + herzie bedrading | ✓       | ✓ 626 regels       | ✓                  | ✓ VERIFIED | 3-stappen pattern expliciet; handleHerzieAdvies + affectedGroepIds + filteredSub              |
| `src/components/cross-analyse/CrossAnalyseWizard.tsx`         | Stap 4 payload + props doorgeven                         | ✓       | ✓ 542 regels       | ✓                  | ✓ VERIFIED | Regel 221-227 payload bevat `capabilityEffortMaps` + `stap2Result` + `stap4Result`            |

### Key Link Verification

| From                                    | To                                                          | Via                                       | Pattern                                     | Status     | Detail                                                                          |
| --------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `schemas.ts`                            | `types.ts`                                                  | z.infer type export                       | `export type VermogenGelijkenisGroep`       | ✓ WIRED    | `schemas.ts:930-931` z.infer exports; `consolidation-guards.ts:11` imports      |
| `consolidation-guards.ts`               | `types.ts`                                                  | Type imports                              | `import type`                               | ✓ WIRED    | Regel 10 `import type { DINEffort, CapabilityEffortMap } from "./types"`        |
| `CrossAnalyseStep.tsx`                  | `consolidation-guards.ts`                                   | Import + guard calls                      | `from "@/lib/consolidation-guards"`         | ✓ WIRED    | Regel 6-10 + 4 callsites (26, 107, 109, 111); volgorde title→same-domain→drieluik |
| `mergeEfforts` body                     | Guard execution order                                       | Call sequence                             | title → same-domain → drieluik-threshold    | ✓ WIRED    | Regel 107→109→111 in dat volgorde                                               |
| `din-suggest/route.ts`                  | `callClaudeWithValidation + ConsolidatieHerzienResponseSchema` | Zod validation branch                   | `type === "consolidatie-herzien"`           | ✓ WIRED    | Regel 80-126 volledige branch; retryable=true bij 422                           |
| `cross-analyse/route.ts`                | `SubEffortAdviesSchema + SUB_EFFORT_ANALYSE_PROMPT`         | Promise.all branch na Stap4Prompt          | `Promise\.all.*SUB_EFFORT_ANALYSE_PROMPT`   | ✓ WIRED    | Regel 244-284; ontbrekende groepen krijgen `return []`                          |
| `CROSS_ANALYSE_STAP2_PROMPT` body       | Schema instructie                                           | AI forcing to `markeer_gelijkenis`        | `markeer_gelijkenis` string aanwezig        | ✓ WIRED    | Regel 178, 188, 205 in prompts.ts                                               |
| `StapSectorVertaling.tsx`               | `stap2Result.vermogenGelijkenisGroepen` + `stap4Result.subEffortAnalysis` | Props + render iteration    | `vermogenGelijkenisGroepen.*map`            | ✓ WIRED    | Regel 285 `vermogenGelijkenisGroepen.map((groep) => ...)` render loop            |
| `StapConsolidatie.tsx`                  | `consolidation-guards.ts (computeAutoApplyResult)`           | Import + gebruik in useEffect             | `computeAutoApplyResult`                    | ✓ WIRED    | Regel 12-13 import; regel 163 call                                              |
| `ClusterCard.tsx`                       | `/api/din-suggest?type=consolidatie-herzien`                | Herzie-advies fetch call                  | `consolidatie-herzien` string                | ✓ WIRED    | Indirect via `onHerzieAdvies` prop → StapConsolidatie.handleHerzieAdvies regel 322 |
| `CrossAnalyseWizard.tsx`                | `/api/cross-analyse` stap 4 payload                         | body.stap2Result.vermogenGelijkenisGroepen + body.capabilityEffortMaps | pattern in fetch body | ✓ WIRED    | Regel 221-227 in payload                                                        |
| `StapConsolidatie.onHerzieAdvies`       | `stap4Result.subEffortAnalysis` cache-invalidatie (D-12)    | filter op affectedGroepIds                | `subEffortAnalysis.*filter`                 | ✓ WIRED    | Regel 346-354                                                                   |

### Data-Flow Trace (Level 4)

| Artifact                           | Data variable                | Source                                                    | Real data? | Status     |
| ---------------------------------- | ---------------------------- | --------------------------------------------------------- | ---------- | ---------- |
| `StapSectorVertaling.tsx`          | `vermogenGelijkenisGroepen`  | `stap2Result.vermogenGelijkenisGroepen` (prop from wizard) | Depends on AI-run | ⚠ STATIC-WITHOUT-AI — code path flows from AI-generated schema data; empty when no stap 2 run yet; correct behavior |
| `StapSectorVertaling.tsx`          | `subEffortAnalysis`          | `stap4Result.subEffortAnalysis` (prop from wizard)         | Depends on AI-run | ⚠ STATIC-WITHOUT-AI — same pattern; flows from `/api/cross-analyse?stap=4` response merged in regel 294 |
| `StapConsolidatie.tsx`             | `inspanningClusters`         | `stap3Result.inspanningClusters` (prop from wizard)        | Depends on AI-run | ⚠ STATIC-WITHOUT-AI — AI-gegenereerd; backward-compat default = `[]` |
| `ConsolidationActionBar`           | `guardError`                 | setState in `tryMerge` catch-block                         | ✓ flows from mergeEfforts throw | ✓ FLOWING — real guard error messages |
| `StapConsolidatie.failedClusterKeys` | `Set<string>`              | `computeAutoApplyResult.failedKeys` (regel 170)            | ✓          | ✓ FLOWING  |
| `/api/cross-analyse stap 4 response` | `subEffortAnalysis` array  | `Promise.all(groepen.map(...))` parallel AI-calls          | ✓ (or [] wanneer geen groepen/efforts) | ✓ FLOWING — per D-13 empty skip |
| `/api/din-suggest consolidatie-herzien` | ZOD-validated response   | `callClaudeWithValidation(ConsolidatieHerzienResponseSchema, ...)` | ✓ Zod-gevalideerd | ✓ FLOWING |

Note: STATIC-WITHOUT-AI is expected behavior — these components render empty states when the AI pipeline hasn't run yet. That's not a stub, it's correct lifecycle. Once Analyseer wordt aangeroepen, data stroomt door.

### Behavioral Spot-Checks

| Behavior                                                   | Command                                                                                                                                    | Result                          | Status |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------ |
| Phase 17 plan-scoped tests pass                            | `npx vitest run src/lib/__tests__/consolidation-guards.test.ts src/lib/__tests__/cross-analyse-schema.test.ts src/lib/__tests__/consolidation.test.ts` | 3 files / **64 tests passed** (413ms) | ✓ PASS |
| Full test suite (no regressions from phase 17)             | `npx vitest run`                                                                                                                            | **309/317 passed** (8 pre-existing failures in persistence/schemas/stap5-focus-filter) | ✓ PASS — exactly as documented in deferred-items.md, no new failures |
| Build passes                                               | `npm run build` (given — exit 0)                                                                                                            | (confirmed in prompt)           | ✓ PASS |
| Runtime behavior of /api/din-suggest?type=consolidatie-herzien | curl POST → 503 when no API key                                                                                                          | Not executed (would require starting dev server) | ? SKIP |
| Runtime behavior of /api/cross-analyse?stap=4              | curl POST → 200 with subEffortAnalysis                                                                                                    | Not executed (would require starting dev server) | ? SKIP |

### Requirements Coverage

| Requirement | Source Plans | Description                                                | Status       | Evidence                                                                                              |
| ----------- | ------------ | ---------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| R-CROSS-01  | 17-01/02/03/04 | Cross-analyse organigram helderheid                     | ✓ SATISFIED (code) / ⚠ UAT | Drieluik-rendering (T22), hefboom-badge (T24), rationale-kop, legacy warning (T30) — 7 UAT cases needed |
| R-CROSS-02  | 17-01/02/03/04 | Domein-bewuste consolidatie kwaliteit                    | ✓ SATISFIED  | Guards werken (T8-T11), AI-prompts herzien (T15-T18), auto-apply 3-stappen (T27), cache-invalidatie (T29) |

Beide phase-requirements komen voor in ALLE 4 plan-frontmatter-secties (no orphans). Geen andere REQUIREMENTS.md IDs mapped naar Phase 17. Note: R-CROSS-01/02 in ROADMAP.md regel 279 vs CROSS-01/02 in REQUIREMENTS.md regel 32-33 — verschillende namespaces (phase-17 specifieke requirement IDs vs algemene v1 requirements). Phase 8 dekte CROSS-01/02 initieel; Phase 17 scherpt aan via R-CROSS-01/02 (methodische correctie).

### Anti-Patterns Found

Grep gedraaid op modified files. Klassificatie volgt stub-detectie-richtlijn (stubs zijn alleen matches waar de waarde naar rendering stroomt ZONDER andere populatie):

| File                                              | Line | Pattern                                        | Severity | Impact                                                                                                    |
| ------------------------------------------------- | ---- | ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/consolidation-guards.ts`                 | 31-96 | `throw new Error(...)`                        | ℹ Info   | Intentional guard throws (D-01/D-02/D-27) — niet een anti-pattern, dit is de specificatie                  |
| `src/components/cross-analyse/StapConsolidatie.tsx` | 184  | `// eslint-disable-line react-hooks/exhaustive-deps` | ℹ Info   | Bewuste dependency-exclusion in useEffect (session + updateSession); geoorloofd per 3-stappen pattern     |
| pre-existing test failures                        | —    | 8 failures in persistence/schemas/stap5-focus-filter | ℹ Info   | Pre-existing (niet door phase 17); gedocumenteerd in `deferred-items.md`                                   |

**Geen stubs, geen TODO/FIXME/placeholder markers in phase 17-scope files.** Alle `return []` matches zijn legitimate backward-compat defaults of D-13 empty-skip patterns.

### Human Verification Required

7 UAT-cases flagged in plan 17-04 (`autonomous: false`). Code-paden zijn geverifieerd en bevatten data-testid hooks (`guard-error-banner`, `herzie-advies-section`, `vermogen-gelijkenis-groep-*`, `hefboomlaag-*`, `requires-review-badge`). Human verificeer:

Zie `human_verification` blok in frontmatter voor de 7 UAT-cases (drieluik-rendering, hefboom-badge tooltip, cross-domein guard banner, herzie-advies round-trip, auto-apply toast, domein-balans badge kleur-coding, legacy warning).

### Gaps Summary

Geen blokkerende gaps. Alle 22 truths met programmatische verifieerbaarheid zijn verified; 8 resterende truths zijn code-verified maar vereisen menselijke UI-inspectie (visuele layout, responsive grid, tooltip hover, toast timing, badge-kleuren, live AI round-trip). De 8 pre-existing test failures zijn out-of-scope en gedocumenteerd in `deferred-items.md`.

**Phase 17 goal achievement:** Code-niveau volledig geïmplementeerd conform alle 4 plan-must-haves. Methodische correctie zichtbaar in code (schema extensies, guards, prompts herzien, API-takken, UI-rewrite). Observable outcomes (R-CROSS-01 organigram helderheid + R-CROSS-02 domein-bewuste consolidatie kwaliteit) vereisen UAT-validatie die het plan expliciet als `autonomous: false` markeerde.

---

_Verified: 2026-04-17T21:15:00Z_
_Verifier: Claude (gsd-verifier, goal-backward methodology)_
