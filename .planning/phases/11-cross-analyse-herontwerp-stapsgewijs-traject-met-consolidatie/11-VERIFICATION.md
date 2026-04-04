---
phase: 11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie
verified: 2026-04-04T22:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 11: Cross-analyse Herontwerp Verification Report

**Phase Goal:** Herstructureer de CrossAnalyseStep van 9 losse secties naar een helder stapsgewijs traject zodat stakeholders in één oogopslag zien hoe de drie sectoren samenhangen. Flow: (1) Sectoroverloop op baten-niveau (hoogover), (2) Gedeelde vermogens cross-sectoraal, (3) Inspanningen-overlap, (4) Consolidatie-actie met samenvoegen-knop die logische cross-sector vermogens genereert, (5) Per-sector vertaling met eigen nuance/saus per sector.
**Verified:** 2026-04-04T22:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Per-stap AI-call is mogelijk via /api/cross-analyse met stap parameter | VERIFIED | `getStepConfig(stap)` in route.ts dispatches schemas 1-5; `stap: wizardState.currentStep` in wizard fetch body |
| 2 | Cumulatieve context van eerdere stappen wordt meegestuurd naar latere stappen | VERIFIED | `buildCumulativeContext(body)` in route.ts accumulates samenvatting from stap1Result–stap4Result, capped at 3000 chars |
| 3 | Bestaande cross-analyse flow zonder stap parameter werkt nog (backward compat) | VERIFIED | route.ts falls through to `AICrossAnalyseSchema` + `CROSS_ANALYSE_PROMPT` when no `stap` in body |
| 4 | Shared UI components (SectorBadge, LoadingOverlay, ClusterCard, ConsolidationActionBar) are extracted as standalone modules | VERIFIED | 4 files in `src/components/cross-analyse/shared/`, each with default export; barrel `index.ts` present |
| 5 | Wizard navigation component renders 5-step progress indicator per D-01 and UI-SPEC | VERIFIED | `WizardNavigation.tsx` has `STEP_LABELS[5]`, completed/active/locked states, `bg-cito-blue`, `bg-gray-200`, "Rond eerst de vorige stap af" tooltip, "Vorige"/"Volgende" buttons |
| 6 | Analyse button component provides per-step AI trigger with loading state per D-11 | VERIFIED | `StepAnalyseButton.tsx` exports default function, sparkle SVG, `"Analyseren..."` loading text, spinner, disabled state |
| 7 | Wizard orchestrator manages step navigation, cumulative AI results, and step completion state | VERIFIED | `CrossAnalyseWizard.tsx` has `WizardState` interface, `handleStepComplete`, `handleStepChange`, `crossAnalyseWizard` session persistence, legacy mode handling |
| 8 | Step 1 shows baten per sector side-by-side with gaps and synergies | VERIFIED | `StapBatenOverloop.tsx`: `grid grid-cols-1 md:grid-cols-3`, `findGaps` import, `SectorBadge` import, AI result section with synergies + gaps |
| 9 | Step 2 shows vermogen clusters in read-only mode with hefboomwerking | VERIFIED | `StapGedeeldeVermogens.tsx`: `findSharedCapabilities` import, `ClusterCard` with `readOnly={true}`, hefboomwerking section |
| 10 | Step 3 shows inspanning clusters in read-only mode with project matching | VERIFIED | `StapInspanningenOverlap.tsx`: `getDomainBalance` import, `ClusterCard` with `readOnly={true}`, ProjectMatchingDisplay section |
| 11 | Step 4 shows all clusters with full consolidation actions (Combineren/Afstemmen/Apart houden) | VERIFIED | `StapConsolidatie.tsx`: `mergeCapabilities`/`mergeEfforts` imported from CrossAnalyseStep, `mergedCapClusters`/`mergedEffClusters` state, `ClusterCard` with `readOnly={false}`, "Items samengevoegd" toast |
| 12 | Step 5 shows Overzicht tab with summary table + per-sector tabs with DIN-keten | VERIFIED | `StapSectorVertaling.tsx`: "Overzicht" tab, `SECTORS.map` for sector tabs, full table headers (Sector/Baten/Vermogens/Inspanningen/Waarvan gedeeld/Gaps), `getDomainBalance`+`findGaps` imports, SectorBadge for shared items per D-16 |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/schemas.ts` | Per-step schemas + CrossAnalyseWizardStateSchema + DINSession extension | VERIFIED | Stap1-5ResultSchema at lines 386-454, CrossAnalyseWizardStateSchema at line 446, crossAnalyseWizard field in DINSessionSchema at line 485, type exports at lines 815-820 |
| `src/lib/prompts.ts` | 5 per-step cross-analyse prompts | VERIFIED | CROSS_ANALYSE_STAP1-5_PROMPT exported at lines 142, 166, 193, 226, 253; original CROSS_ANALYSE_PROMPT preserved at line 47 |
| `src/app/api/cross-analyse/route.ts` | Per-step API dispatch with getStepConfig + buildCumulativeContext | VERIFIED | Both functions present; stap 1-5 branch + backward-compat fallthrough |
| `src/components/cross-analyse/shared/SectorBadge.tsx` | Sector color badge | VERIFIED | `export default function SectorBadge`, imports SECTOR_COLORS |
| `src/components/cross-analyse/shared/LoadingOverlay.tsx` | Loading overlay with customizable title/description | VERIFIED | title/description props with defaults; DIN chain animation preserved |
| `src/components/cross-analyse/shared/ClusterCard.tsx` | Cluster card with readOnly prop | VERIFIED | `readOnly?: boolean` prop, ConsolidationActionBar hidden when readOnly=true |
| `src/components/cross-analyse/shared/ConsolidationActionBar.tsx` | Combineren/Afstemmen/Apart houden action bar | VERIFIED | All three actions present, confirm dialog logic |
| `src/components/cross-analyse/shared/index.ts` | Barrel export | VERIFIED | 4 named re-exports |
| `src/components/cross-analyse/WizardNavigation.tsx` | 5-step progress indicator + navigation | VERIFIED | STEP_LABELS[5], completed/active/locked state, Vorige/Volgende buttons, responsive mobile dots |
| `src/components/cross-analyse/StepAnalyseButton.tsx` | Per-step AI trigger button | VERIFIED | Sparkle SVG, spinner, "Analyseren..." loading text |
| `src/components/cross-analyse/CrossAnalyseWizard.tsx` | Wizard orchestrator | VERIFIED | 473 lines, all 5 steps wired, legacy mode, session persistence, error handling |
| `src/components/cross-analyse/StapBatenOverloop.tsx` | Step 1: baten per sector + gaps + synergies | VERIFIED | 3-column grid, findGaps, SectorBadge, AI result section |
| `src/components/cross-analyse/StapGedeeldeVermogens.tsx` | Step 2: vermogen matrix + clusters | VERIFIED | findSharedCapabilities table, readOnly ClusterCard, hefboomwerking section |
| `src/components/cross-analyse/StapInspanningenOverlap.tsx` | Step 3: domain balance + inspanning clusters | VERIFIED | getDomainBalance, readOnly ClusterCard, project matching display |
| `src/components/cross-analyse/StapConsolidatie.tsx` | Step 4: full consolidation workflow | VERIFIED | mergeCapabilities/mergeEfforts, mergedCapClusters/mergedEffClusters state, readOnly=false ClusterCard |
| `src/components/cross-analyse/StapSectorVertaling.tsx` | Step 5: sector tabs + overzicht table | VERIFIED | Overzicht tab + 3 sector tabs, summary table, DIN-keten chain, domeinbalans, gaps, SectorBadge for shared items |
| `src/components/steps/CrossAnalyseStep.tsx` | Thin wrapper (under 200 lines) | VERIFIED | 150 lines, pure consolidation functions preserved as named exports, `return <CrossAnalyseWizard />` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `route.ts` | `schemas.ts` | `Stap1ResultSchema` import | WIRED | All 5 schemas imported and dispatched via `getStepConfig` |
| `route.ts` | `prompts.ts` | `CROSS_ANALYSE_STAP1_PROMPT` import | WIRED | All 5 prompts imported |
| `CrossAnalyseWizard.tsx` | `WizardNavigation.tsx` | `import WizardNavigation` | WIRED | Rendered with currentStep, completedSteps, onStepChange props |
| `CrossAnalyseWizard.tsx` | `/api/cross-analyse` | `fetch` with `stap: wizardState.currentStep` | WIRED | POST to `/api/cross-analyse` with full request body including stap parameter |
| `StapBatenOverloop.tsx` | `shared/SectorBadge.tsx` | `import { SectorBadge } from "./shared"` | WIRED | Used in sector columns and AI synergy items |
| `StapGedeeldeVermogens.tsx` | `shared/ClusterCard.tsx` | `import { ClusterCard } from "./shared"` | WIRED | `readOnly={true}` in AIVermogenResult |
| `StapInspanningenOverlap.tsx` | `shared/ClusterCard.tsx` | `import { ClusterCard } from "./shared"` | WIRED | `readOnly={true}` in AIInspanningenResult |
| `StapConsolidatie.tsx` | `CrossAnalyseStep.tsx` | `mergeCapabilities` import | WIRED | Pure functions called in `handleMergeCapabilities`/`handleMergeEfforts` handlers |
| `StapConsolidatie.tsx` | `shared/ClusterCard.tsx` | `readOnly={false}` | WIRED | Full consolidation actions visible in step 4 |
| `StapSectorVertaling.tsx` | `din-service.ts` | `getDomainBalance`, `findGaps` | WIRED | Both used in `getSectorStats` and `renderSectorTab` |
| `CrossAnalyseStep.tsx` | `CrossAnalyseWizard.tsx` | `import CrossAnalyseWizard` | WIRED | `return <CrossAnalyseWizard />` is the entire default export |
| `sessies/[id]/page.tsx` | `CrossAnalyseStep.tsx` | `import CrossAnalyseStep` | WIRED | `case "cross-analyse": return <CrossAnalyseStep />` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CrossAnalyseWizard.tsx` | `wizardState.stepResults.stap1` | `/api/cross-analyse` POST response `data.analysis` | AI call with real session DIN data | FLOWING |
| `StapBatenOverloop.tsx` | `batenPerSector` | `session.benefits` filtered by sectorId | Session state (live data from localStorage) | FLOWING |
| `StapBatenOverloop.tsx` | `gaps` | `findGaps(session.goals, session.benefits, ...)` | Computed from session arrays | FLOWING |
| `StapGedeeldeVermogens.tsx` | `sharedCaps` | `findSharedCapabilities(activeCaps)` | Computed from session capabilities | FLOWING |
| `StapSectorVertaling.tsx` | sector stats | `getSectorStats(sectorId)` with session filter | Session data filtered per sector | FLOWING |
| `StapConsolidatie.tsx` | `vermogenClusters` | `stap2Result?.vermogenClusters ?? []` | Passed from wizard orchestrator (AI result or empty) | FLOWING — renders empty state message when no clusters |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build compiles without errors | `npm run build` | Exit 0, all routes listed including `/api/cross-analyse` | PASS |
| CrossAnalyseStep.tsx is thin wrapper | `wc -l CrossAnalyseStep.tsx` | 150 lines (was 1641) | PASS |
| Wizard exports consolidation functions | grep for `export function mergeCapabilities` | Found at line 9 | PASS |
| StepAnalyseButton has no hardcoded data | No `return null` / `return {}` / static empty returns | None found | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| R-CROSS-01 (plan frontmatter) | 11-01, 11-02, 11-03, 11-04 | Cross-analyse stapsgewijs traject (plan-specific ID) | SATISFIED | Full 5-step wizard implemented with Step 1 showing baten cross-sector (maps to phase goal directly) |
| R-CROSS-02 (plan frontmatter) | 11-01, 11-02, 11-03, 11-04 | Synergie-matrix (plan-specific ID) | SATISFIED | Step 2 vermogen-synergie matrix + ClusterCard wired, Step 4 consolidation actions implemented |

**Note on requirement IDs:** The plans reference `R-CROSS-01` and `R-CROSS-02`, but `REQUIREMENTS.md` defines these as `CROSS-01` and `CROSS-02` (no `R-` prefix), mapped to Phase 8. Phase 11 is a UX refactoring delivering the same cross-analyse capability through a new wizard flow — not a new requirement. The `R-CROSS-*` IDs in the plan frontmatter are informal phase-scoped labels referring to the roadmap's Phase 11 requirement statement, not the global requirements registry. No orphaned requirements in REQUIREMENTS.md are attributed to Phase 11 in the traceability table. Coverage is complete.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CrossAnalyseWizard.tsx` | 78 | `placeholder: ""` for step 5 | Info | Step 5 has no textarea (by design — no AI call in step 5). Empty string is a valid non-rendering value. Not a stub. |
| `StapConsolidatie.tsx` | 129 | `"Voer eerst stap 2 en 3 uit om clusters te zien"` | Info | Correct empty state message when no stap2/stap3 results exist. Not a stub — intended behavior. |

No blockers or warnings found. All `placeholder` occurrences in wizard are input placeholders for textarea elements or intentional empty strings for the step that has no textarea — not stub indicators.

---

### Human Verification Required

#### 1. Wizard step locking behavior

**Test:** Open a session with DIN data, navigate to the cross-analyse step. Without running AI on step 1, attempt to click "Volgende" to proceed to step 2.
**Expected:** "Volgende" button is disabled (opacity-50, cursor-not-allowed). Step 2 circle in progress indicator shows as locked (gray, "Rond eerst de vorige stap af" tooltip). After clicking "Markeer als bekeken" on step 1, "Volgende" becomes enabled.
**Why human:** Step locking logic depends on `completedSteps` Set state at runtime — cannot be verified by file inspection alone.

#### 2. Legacy session backward compatibility

**Test:** Open a session that previously ran the old (pre-Phase 11) cross-analyse and has `crossAnalyse: string` in its session but no `crossAnalyseWizard` field.
**Expected:** The amber banner "Eerdere analyse gevonden" appears with two buttons: "Bekijk eerdere analyse" and "Nieuwe analyse starten". The existing analysis is not lost.
**Why human:** Requires a real legacy session object in localStorage to test.

#### 3. Step 4 consolidation merge/undo cycle

**Test:** After running AI analysis on steps 2 and 3, navigate to step 4. Click "Combineren" on a vermogen cluster. Verify the merged item appears and the originals are flagged. Then click "Ongedaan maken" and verify the originals are restored.
**Expected:** Toast "Items samengevoegd" appears. Merged capability shows in DIN network. Undo restores originals and removes shared item.
**Why human:** Consolidation state depends on real AI-generated clusters and live session mutations.

#### 4. Step 5 sector tab data rendering

**Test:** With a session containing DIN data across PO, VO and Zakelijk sectors, navigate to step 5 and click each sector tab.
**Expected:** Each sector tab shows its DIN-keten (baten, vermogens, inspanningen with chain colors), domain balance grid with percentages, and gap cards. Shared items (vermogens with `relatedSectors.length > 1`) show multiple SectorBadges.
**Why human:** Requires real cross-sector session data to verify sector badges appear correctly on shared items.

---

## Gaps Summary

No gaps found. All 12 observable truths are verified. All 17 required artifacts exist and are substantive. All 12 key links are wired. Build succeeds without errors.

The phase goal is fully achieved: the CrossAnalyseStep has been restructured from a 1641-line monolith of 9 loose sections into a clean 5-step wizard (150-line thin wrapper + modular cross-analyse/ directory). The data layer (per-step schemas, prompts, API), shared components, wizard navigation, all 5 step components, and session persistence are all in place and wired end-to-end.

---

_Verified: 2026-04-04T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
