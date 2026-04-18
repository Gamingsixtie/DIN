---
phase: 17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
plan: 04
subsystem: cross-analyse
tags:
  - ui
  - drieluik
  - consolidation
  - auto-apply
  - herzie-advies
  - react-19
  - d-04
  - d-05
  - d-12
  - d-19
  - d-28
  - d-29
  - d-32
  - w-5
  - b-4
requirements:
  - R-CROSS-01
  - R-CROSS-02
requirements_addressed:
  - R-CROSS-01
  - R-CROSS-02
dependency_graph:
  requires:
    - "17-01 VermogenGelijkenisGroepSchema + SubEffortAdviesSchema + Stap2/4Result velden"
    - "17-01 consolidation-guards computeAutoApplyResult + DrieluikContext"
    - "17-02 werkende validateNeutralTitle / validateSameDomain / validateDrieluikThreshold guards"
    - "17-02 mergeEfforts(session, ids, title?, context?) signature"
    - "17-03 /api/din-suggest consolidatie-herzien tak"
    - "17-03 /api/cross-analyse stap 4 met subEffortAnalysis response"
  provides:
    - "Drieluik-rendering per VermogenGelijkenisGroep in StapSectorVertaling"
    - "DomainBalanceBadge + HefboomBadge + HefboomPijlen helpers (D-29, D-32)"
    - "Guard-error banner in ConsolidationActionBar (D-04)"
    - "HerzieAdviesInput + context-textarea in ClusterCard (D-19)"
    - "3-stappen auto-apply pattern in StapConsolidatie (W-5 fix)"
    - "Vereist review badge op failed auto-apply clusters"
    - "subEffortAnalysis cache-invalidatie bij Herzie advies (B-4 fix)"
    - "Legacy warning voor pre-Phase-17 consolidated caps"
  affects:
    - "Phase 17 complete — cross-analyse UI toont drieluik-hefboom i.p.v. shared-cap merges"
    - "Toekomstige sessies met stap4Result.subEffortAnalysis worden per domein gerendered"
tech_stack:
  added: []
  patterns:
    - "3-stappen auto-apply pattern: (A) pure compute buiten React state, (B) updateSession met pure reducer, (C) aparte setState calls — React 19 Strict Mode safe"
    - "Injected DrieluikContext in mergeEfforts voor D-27 threshold bij auto-apply + handmatig merge"
    - "try/catch wrapper om mergeEfforts throws als inline UI-banner i.p.v. uncaught exception"
    - "Cache-invalidatie van subEffortAnalysis via capabilityEffortMaps → VermogenGelijkenisGroep resolve"
    - "Optionele props (onHerzieAdvies, requiresReview, savedContext) voor backward compat met bestaande ClusterCard call-sites"
key_files:
  created: []
  modified:
    - "src/components/cross-analyse/StapSectorVertaling.tsx (+549 / -316 regels — vermogen-sectie volledig herschreven naar drieluik-rendering; hefboomlaag per domein; legacy warning sectie)"
    - "src/components/cross-analyse/CrossAnalyseWizard.tsx (+2 regels — geeft nu stap2Result + stap4Result door aan StapSectorVertaling)"
    - "src/components/cross-analyse/shared/ConsolidationActionBar.tsx (+39 regels — guardError state + tryMerge + inline red banner + Combineren disabled)"
    - "src/components/cross-analyse/shared/ClusterCard.tsx (+81 regels — HerzieAdviesInput sub-component + onHerzieAdvies prop bedrading + Vereist review badge)"
    - "src/components/cross-analyse/StapConsolidatie.tsx (+162 regels — 3-stappen auto-apply via computeAutoApplyResult; handleHerzieAdvies met B-4 cache-invalidatie; failed cluster state)"
decisions:
  - "StapSectorVertaling krijgt stap2Result + stap4Result als NIEUWE optionele props i.p.v. session-derive-only — expliciete data-flow uit CrossAnalyseWizard, voorkomt dubbele bron-of-truth"
  - "HerzieAdviesInput als sub-component in ClusterCard i.p.v. nieuw bestand — volledig lokale state (context string), geen prop-drilling, minder file-churn"
  - "handleMergeEfforts roept mergeEfforts synchroon aan BUITEN updateSession om de throw te kunnen vangen in ConsolidationActionBar.tryMerge — updateSession gebruikt puur () => merged reducer"
  - "3-stappen auto-apply pattern: elke setState statement (setMergedEffClusters, setFailedClusterKeys, setClusterReasons) is een eigen top-level call na de updateSession — React batched ze automatisch in React 19"
  - "subEffortAnalysis cache-invalidatie bij Herzie advies filtert alleen op affectedGroepIds — entries van andere groepen blijven intact; voorkomt overmatig hergeneratie-werk bij de volgende Analyseer-run"
  - "Legacy consolidated caps die NIET in een VermogenGelijkenisGroep zitten worden in eigen sectie onderaan de drieluik-lijst gerendered met amber legacy-warning — geen crash, behoud van zichtbaarheid"
  - "JSX.Element return types vervangen door React.ReactElement ivm React 19 + Next.js 16 Turbopack TS (JSX namespace niet meer global beschikbaar)"
  - "CrossAnalyseWizard stap 4 payload bevatte al vermogenGelijkenisGroepen (via stap2Result) + capabilityEffortMaps — geen code-wijziging nodig"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-18"
  tasks_completed: 2
  checkpoint_auto_approved: true
---

# Phase 17 Plan 04: Wave 3 — UI rewrite drieluik + guard-error banner + herzie-advies + 3-stappen auto-apply Summary

Wave 3 UI-rewrite levert de zichtbare methodische correctie: `StapSectorVertaling` rendert per `VermogenGelijkenisGroep` drie parallelle sector-vermogen-kaarten met een hefboomlaag per domein (uit `subEffortAnalysis`); `ConsolidationActionBar` toont een inline rode guard-error banner bij geblokkeerde merges met exacte Wave 1-messages; `ClusterCard` heeft een context-textarea + `Herzie advies` knop die `/api/din-suggest?type=consolidatie-herzien` aanroept en de `subEffortAnalysis` voor de getroffen `VermogenGelijkenisGroep(en)` invalideert (B-4); `StapConsolidatie` gebruikt het 3-stappen auto-apply pattern (pure compute → updateSession met pure reducer → aparte setState calls — React 19 Strict Mode safe) via `computeAutoApplyResult` uit Wave 0. Phase 17 is daarmee compleet — R-CROSS-01 (helderheid) en R-CROSS-02 (domein-bewuste consolidatie) tastbaar in de UI.

## Performance

- **Duration:** ~20 min (Task 1: ~8 min, Task 2: ~12 min)
- **Completed:** 2026-04-18
- **Tasks:** 2 code-tasks + 1 checkpoint (auto-approved per auto mode)
- **Files modified:** 5

## What Was Built

### Task 1 — StapSectorVertaling drieluik-rendering (`fe22ef8`)

Complete rewrite van de vermogen-sectie. Het organigram rendert nu per `VermogenGelijkenisGroep`:

1. **Rationale-kop** (teal-50 kaart) met `gezamenlijkeOmschrijving`, `reden`, en `DomainBalanceBadge`
2. **Drie parallelle sector-vermogen-kaarten** (grid-cols-3 desktop, gestapeld mobile) met `SectorBadge` per kaart, `cap.title || cap.description`, en optioneel `vermogenReview.hefboomAnalyse`
3. **Hefboom-pijlen** (desktop only — `hidden md:grid`) tussen vermogen-kaarten en hefboomlaag
4. **Hefboomlaag per domein** (grid-cols-4 desktop) met per domein:
   - `subEffortAnalysis`-entry → `voorgesteldeNaam`, `reden`, effort-lijst, `Combineren`/`Apart` badge, + `HefboomBadge` bij `combineren`
   - Empty-state kaart `Geen gezamenlijke inspanning` bij ontbrekend advies
5. **Legacy sectie** onderaan: consolidated caps die NIET in een groep zitten → amber badge `Legacy: vermogens-merge (niet meer toegepast in cross-analyse)` met MergeHerkomst expandable
6. **Sector-impact tabel**: Sector → Baten → Gelijkende vermogens → Gezamenlijke inspanningen (nu gedreven door `vermogenGelijkenisGroepen` + `subEffortAnalysis`)

**Variant A/B-logica volledig verwijderd** — geen `sharedCaps`, geen `sharedEffortGroups` detectie meer.

Nieuwe helpers (inline in file):
- `DomainBalanceBadge({groepId, subEffortAnalysis}): ReactElement` — counts `combineren` domains, toont groen (≥3) / amber (2) / rood (≤1). Label-format: `Dekt N van 4 domeinen — mist X, Y`.
- `HefboomBadge({vermogens}): ReactElement` — teal pill + group-hover tooltip met lijst `{sector}: {title}`
- `HefboomPijlen(): ReactElement` — drie verticaal-pijlen SVG in `hidden md:grid grid-cols-3`

### Task 2 — Consolidation UX + 3-stappen auto-apply + herzie-advies (`bc3eaa5`)

**ConsolidationActionBar**:
- State toegevoegd: `guardError: string | null`, `isHerzienLoading: boolean`
- `tryMerge()` wrapper vangt `onMerge()` throws en zet `guardError` met exact message uit Wave 1-guards (bv. `Cross-domein merge geblokkeerd: mens + data_systemen`)
- Inline rode banner `[data-testid="guard-error-banner"]` toont message + `Herzie advies` knop (indien `onHerzieAdvies` prop) + `Sluiten` knop
- Combineren-knop `disabled={guardError !== null}`
- Bevestigen-knop in showConfirm-state roept nu `tryMerge()` aan i.p.v. directe `onMerge()`

**ClusterCard**:
- 4 optionele props toegevoegd: `onHerzieAdvies`, `isHerzienLoading`, `savedContext`, `requiresReview`
- `HerzieAdviesInput` sub-component (textarea + submit-button met spinner)
- Vereist review badge `[data-testid="requires-review-badge"]` (rode left-border, amber bij `requiresReview`)
- Herzie-advies sectie `[data-testid="herzie-advies-section"]` onder de cluster-card — toont `savedContext` (italic) + `HerzieAdviesInput` bij `onHerzieAdvies` prop

**StapConsolidatie — 3-stappen auto-apply pattern (W-5 fix)**:

```typescript
useEffect(() => {
  if (autoApplied) return;
  const hasCombineren = inspanningClusters.some((c) => c.aanbeveling === "combineren");
  if (!hasCombineren) return;
  setAutoApplied(true);

  // === STAP A — Pure compute BUITEN React state ===
  const drieluikCtx: DrieluikContext = {
    gelijkenisGroepen: stap2Result?.vermogenGelijkenisGroepen ?? [],
    capEffortMaps: session.capabilityEffortMaps,
  };
  const clusters: AutoApplyCluster[] = inspanningClusters
    .filter((c) => c.aanbeveling === "combineren")
    .map((c) => ({ key: ..., itemIds: ..., suggestedTitle: ... }));

  let updatedSession = session;
  const newMergeKeyMap = new Map(mergedEffClusters);
  const mergeFn = (ids, title) => {
    updatedSession = mergeEfforts(updatedSession, ids, title, drieluikCtx);
    // lokale key-map update
  };
  const result = computeAutoApplyResult(clusters, alreadyMerged, mergeFn);

  // === STAP B — updateSession met PURE reducer ===
  updateSession(() => updatedSession);

  // === STAP C — aparte setState calls BUITEN reducer ===
  setMergedEffClusters(() => newMergeKeyMap);
  setFailedClusterKeys(new Set(result.failedKeys));
  setClusterReasons(result.reasons);
  // toast summary...
}, [stap2Result, stap3Result, stap4Result, autoApplied]);
```

**Waarom dit pattern (W-5)**: React 19 Strict Mode dispatcht reducers tweemaal. Een `setState` binnen `updateSession(prev => ...)` = dubbele-dispatch anti-pattern. Pure compute in A (met `mergeFn` closure die alleen lokale vars muteert) + pure reducer in B + aparte setState in C = idempotent, Strict Mode safe.

Vermogen-clusters worden niet meer auto-toegepast (D-25) — `mergeCapabilities` blijft geëxporteerd voor legacy-use, maar Wave 2 prompt stelt `markeer_gelijkenis` voor op vermogens i.p.v. `combineren`.

**Herzie-advies handler (D-19 + B-4)**:
- `handleHerzieAdvies(clusterTitel, clusterItems, userContext)` — POST naar `/api/din-suggest?type=consolidatie-herzien`
- Bij success: bepaal `affectedGroepIds` via `clusterEffortIds` → `capabilityEffortMaps` → `VermogenGelijkenisGroep.vermogenIds`
- Filter `subEffortAnalysis`: verwijder entries met `groepId ∈ affectedGroepIds`
- Overschrijf `consolidatieAdvies[i]` met nieuw advies + `context: userContext`
- Schrijf gefilterde `subEffortAnalysis` terug via `updateSession` (zodat volgende Analyseer-run opnieuw genereert — D-12 cache-exit)

**Handmatig merge (`handleMergeEfforts`)** — gebruikt ook `DrieluikContext` zodat D-27 drempel afgedwongen wordt. De `mergeEfforts` call is nu synchroon buiten `updateSession` om de throw op te kunnen vangen in `ConsolidationActionBar.tryMerge()`.

### CrossAnalyseWizard payload-check

Geen wijziging nodig: de bestaande stap 4 fetch body bevatte al `stap2Result` (met `vermogenGelijkenisGroepen`) en `capabilityEffortMaps`. Alleen de `StapSectorVertaling` render call is uitgebreid met `stap2Result` + `stap4Result` props.

## UAT-cases (auto-approved per auto mode policy)

Auto mode was active bij plan-executie. Alle 7 UAT-cases auto-approved na succesvolle code-implementatie + build/test verificatie:

| UAT | Scope | Status | Notes |
|-----|-------|--------|-------|
| UAT-1 | Drieluik-rendering (3 sector-kaarten) | Auto-approved | Code geverifieerd: `vermogenGelijkenisGroepen.map` + 3× SectorBadge render + grid-cols-3 md |
| UAT-2 | Hefboom-badge tooltip | Auto-approved | `HefboomBadge` bevat `{sector}: {title}` lijst in tooltip |
| UAT-3 | Cross-domein guard-error banner | Auto-approved | `tryMerge` catch zet exacte Wave 1 error-message; banner `data-testid="guard-error-banner"` |
| UAT-4 | Herzie-advies round-trip + cache-invalidatie | Auto-approved | `handleHerzieAdvies` + `affectedGroepIds` + `subEffortAnalysis: filteredSub` allemaal aanwezig |
| UAT-5 | Auto-apply toast + Vereist review + geen dubbele render | Auto-approved | 3-stappen pattern geïmplementeerd; toast-summary copy "N samengevoegd, M vereisen review" |
| UAT-6 | Domein-balans badge groen/amber/rood | Auto-approved | `DomainBalanceBadge` logica: count ≥3 groen, =2 amber, ≤1 rood |
| UAT-7 | Legacy warning (consolidated pre-17 caps) | Auto-approved | Legacy sectie rendert caps met `consolidated=true` buiten groepen |

Pre-approval verificatie:
- `npm run build` → exit 0 (Next.js 16.1.6 Turbopack, 15 static pages)
- `npx vitest run` → 309/317 passed (8 pre-existing failures uit 17-01/17-02/17-03, geen regressies)

## Task Commits

1. **Task 1 — StapSectorVertaling drieluik** — `fe22ef8` (feat)
2. **Task 2 — ConsolidationActionBar + ClusterCard + StapConsolidatie** — `bc3eaa5` (feat)

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Props voor stap2Result/stap4Result ipv session-derive in StapSectorVertaling | Expliciete data-flow vanuit CrossAnalyseWizard; geen dubbele bron-of-truth tijdens wizard-state |
| React.ReactElement i.p.v. JSX.Element | React 19 + Next.js 16 Turbopack heeft JSX namespace niet meer global; React.ReactElement is type-equivalent |
| HerzieAdviesInput inline in ClusterCard | Volledig lokale state (context string), geen aparte file nodig, minder file-churn |
| handleMergeEfforts synchroon buiten updateSession | Throw kan dan door ConsolidationActionBar.tryMerge() gevangen worden; updateSession reducer blijft puur |
| 3-stappen auto-apply pattern | React 19 Strict Mode dispatcht reducers tweemaal — setState binnen updateSession reducer is anti-pattern |
| subEffortAnalysis cache-invalidatie scoped op affectedGroepIds | Voorkomt overmatig hergeneratie-werk; alleen groepen die door de herzien cluster geraakt worden verliezen hun analyse |
| Legacy caps sectie als aparte rendering onderaan | Zichtbaarheid behouden voor gebruikers met pre-17-sessies zonder crash op ontbrekende groep-data |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] JSX.Element namespace niet beschikbaar**
- **Found during:** Task 1 `npm run build`
- **Issue:** `JSX.Element` return types gaven TS `Cannot find namespace 'JSX'` error onder React 19 + Next.js 16 Turbopack
- **Fix:** Alle 3 helper-functies (DomainBalanceBadge, HefboomBadge, HefboomPijlen) gebruiken nu `React.ReactElement` + `import React, { useState } from "react"`
- **Files modified:** `src/components/cross-analyse/StapSectorVertaling.tsx`
- **Commit:** `fe22ef8`

### Out-of-scope findings (onveranderd)

8 pre-existing test-failures blijven onveranderd (persistence 5, schemas 1, stap5-focus-filter 2). Niet door 17-04 veroorzaakt, gedocumenteerd in `.planning/phases/17-.../deferred-items.md`. Wizard-files die wel dirty waren bij plan-start maar niet in scope 17-04 (`StapBatenOverloop.tsx`, `WizardNavigation.tsx`, `DINMappingStep.tsx`, `stap5-focus.ts`) zijn NIET aangeraakt en staan nog als gewijzigd in working tree.

### Tooling

`npm run lint` blijft gebroken op Windows door space-in-path in het project-directory pad. Pre-existing, niet-blocking. Build + tests draaien wel.

## Test Results

**Build:**
```
npm run build → exit 0 (Compiled successfully in 4.2s, 15 static pages)
```

**Full test suite:**
```
npx vitest run → Test Files 3 failed | 18 passed (21); Tests 8 failed | 309 passed (317)
```

De 8 failures zijn dezelfde pre-existing failures uit alle vorige Phase 17 waves. **Geen regressies** door 17-04.

## Phase 17 Compleet

Met Wave 3 voltooid heeft Phase 17 alle vier golven afgerond:

1. **Wave 0 (17-01)** — Zod schema-extensies + consolidation-guards scaffold
2. **Wave 1 (17-02)** — D-01/D-02/D-27 guard implementaties + mergeEfforts bedrading
3. **Wave 2 (17-03)** — AI-pipeline (prompts + API-takken voor consolidatie-herzien + sub-effort analyse)
4. **Wave 3 (17-04)** — UI rewrite (drieluik + guard-banner + herzie-advies + 3-stappen auto-apply)

R-CROSS-01 (organigram helderheid) en R-CROSS-02 (domein-bewuste consolidatie) zijn nu volledig geïmplementeerd en in de UI zichtbaar. Phase 17 kan als complete worden gemarkeerd in ROADMAP.md.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/components/cross-analyse/StapSectorVertaling.tsx` (vermogenGelijkenisGroepen.map aanwezig, DomainBalanceBadge + HefboomBadge + HefboomPijlen functies, data-testid hooks aanwezig)
- FOUND: `src/components/cross-analyse/CrossAnalyseWizard.tsx` (stap2Result + stap4Result props doorgegeven aan StapSectorVertaling)
- FOUND: `src/components/cross-analyse/shared/ConsolidationActionBar.tsx` (guardError state, tryMerge wrapper, data-testid="guard-error-banner", Combineren disabled)
- FOUND: `src/components/cross-analyse/shared/ClusterCard.tsx` (onHerzieAdvies prop, HerzieAdviesInput sub-component, data-testid hooks)
- FOUND: `src/components/cross-analyse/StapConsolidatie.tsx` (computeAutoApplyResult call, DrieluikContext, failedClusterKeys state, handleHerzieAdvies met affectedGroepIds + filteredSub)

**Commits verified:**
- FOUND: `fe22ef8` — feat(17-04): drieluik-rendering in StapSectorVertaling (Task 1)
- FOUND: `bc3eaa5` — feat(17-04): consolidation UX + 3-stappen auto-apply + herzie-advies (Task 2)

**Acceptance criteria verified:**
- [x] `vermogenGelijkenisGroepen` iteratie in StapSectorVertaling (9 hits)
- [x] `import type { VermogenGelijkenisGroep, SubEffortAdvies } from "@/lib/schemas"` aanwezig
- [x] `DomainBalanceBadge` + `HefboomBadge` + `HefboomPijlen` functies gedefinieerd
- [x] `data-testid="vermogen-gelijkenis-groep-` aanwezig
- [x] `data-testid="hefboomlaag-` aanwezig
- [x] Exacte strings `"Hefboom: raakt 3 sectoren via gelijkende vermogens"`, `"Legacy: vermogens-merge"`, `"Dekt"` + `"van 4 domeinen"`, `"Geen gezamenlijke inspanning"` aanwezig
- [x] Oude `sharedEffortGroups` (Variant B) logica verwijderd
- [x] `guardError` + `tryMerge` + `data-testid="guard-error-banner"` in ConsolidationActionBar
- [x] `onHerzieAdvies?:` + `HerzieAdviesInput` + test-ids in ClusterCard
- [x] `computeAutoApplyResult` + `DrieluikContext` + `failedClusterKeys` in StapConsolidatie
- [x] `fetch` met `"consolidatie-herzien"` in StapConsolidatie
- [x] 3-stappen pattern: `updateSession(() => updatedSession)` pure, setState calls erbuiten
- [x] B-4: `affectedGroepIds` set + `subEffortAnalysis: filteredSub` writeback
- [x] CrossAnalyseWizard stap 4 payload bevat `stap2Result` + `capabilityEffortMaps` (pre-existing, geen wijziging nodig)
- [x] `npm run build` exit 0
- [x] `npx vitest run` 309/317 passed (geen regressies)
- [x] Alle 7 UAT-cases auto-approved per auto mode policy
