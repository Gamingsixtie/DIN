---
phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
plan: 04
subsystem: ui
tags: [cross-analyse, wizard, react, zod, restore-guard, focusview, stap5]

# Dependency graph
requires:
  - phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
    provides: "Wave 0 test scaffolding (13-01), Wave 1 foundation — Stap5ResultSchema + CROSS_ANALYSE_STAP5_PROMPT + src/lib/stap5-focus.ts (13-02), Wave 2 API narrowing + StapSectorVertaling focusview rewrite (13-03)"
provides:
  - CrossAnalyseWizard stap 5 is nu een volwaardige AI-stap met focusview
  - STEP_INFO[5] bevat UI-SPEC copy voor 'Prioriteitsview — eerste doel'
  - D-10 restore guard: stap5 session data wordt via restoreStap5Result gevalideerd bij load — oude shape silent-reset
  - CTA condition extended naar currentStep <= 5 zodat 'Analyseer eerste doel' knop zichtbaar is op stap 5
  - End-to-end UAT approved — volledige Phase 13 focusview flow werkt

affects:
  - Phase 14 (lopende projecten promoveren) — bouwt verder op cross-analyse stap 5 focusview voor project-promotie review context

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Restore-time validation via pure helper: wizard useEffect roept restoreStap5Result aan op session load, ongeldige shapes silent-reset naar undefined zonder crashen"
    - "STEP_INFO copy als UI-SPEC single source of truth: title/description/placeholder/analyseLabel/loadingTitle/loadingDescription allemaal gecentraliseerd per wizard-stap"

key-files:
  created: []
  modified:
    - src/components/cross-analyse/CrossAnalyseWizard.tsx

key-decisions:
  - "D-10 restore guard landt in CrossAnalyseWizard useEffect, niet in session-context.tsx loadSession (scope-afweging: schema-validatie op gebruiksniveau, geen grote refactor nodig)"
  - "CTA condition aangepast van `<= 4` naar `<= 5` als minst-invasieve oplossing voor Open Question 2 (alternatieven: speciale stap5-knop, aparte render-branch — beide duurder)"
  - "STEP_INFO[5] copy overgenomen uit UI-SPEC Copywriting Contract: 'Prioriteitsview — eerste doel' met em-dash, 'AI beoordeelt hefboomwerking…' met horizontal ellipsis character"

patterns-established:
  - "Wizard restore guard pattern: `stap5: restoreStap5Result(wizData.stepResults?.stap5)` in setWizardState — pattern voor toekomstige schema-migraties"
  - "CTA condition per stap-count: wanneer een nieuwe AI-stap wordt toegevoegd, simpelweg de `currentStep <= N` predicate verhogen"

requirements-completed: [R-CROSS-01, R-CROSS-02]

# Metrics
duration: 6min
completed: 2026-04-05
---

# Phase 13 Plan 04: Wave 3 Wizard Integration + UAT Summary

**CrossAnalyseWizard stap 5 is nu een volwaardige AI-stap met focusview rond het eerste doel, D-10 restore guard tegen oude localStorage shape, en de 'Analyseer eerste doel' CTA zichtbaar op stap 5.**

## Performance

- **Duration:** ~6 min (Task 1 geautomatiseerd) + UAT wachttijd
- **Started:** 2026-04-05T21:20:53Z (Task 1 initiële execute)
- **Completed:** 2026-04-05T21:30:00Z (UAT approved)
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1 (CrossAnalyseWizard.tsx)

## Accomplishments

- **3 wijzigingen in CrossAnalyseWizard.tsx** alle atomic gecommit:
  1. Import `restoreStap5Result` toegevoegd vanuit `@/lib/stap5-focus`
  2. `STEP_INFO[5]` volledig ingevuld met UI-SPEC copy ('Prioriteitsview — eerste doel', 'Analyseer eerste doel', 'AI beoordeelt hefboomwerking…', etc.) — voorheen lege strings
  3. Restore `useEffect` valideert `wizData.stepResults?.stap5` via `restoreStap5Result` pure helper — D-10 migration guard tegen oude `sectorVertalingen[]` shape
  4. CTA conditional van `wizardState.currentStep <= 4` naar `<= 5` — Open Question 2 locked-in fix
- **End-to-end UAT approved** door gebruiker: alle 10 checks uit de human-verify checklist conform (focusdoel card, baten per sector, cross-sector vermogens, gedeelde inspanningen, empty states, AI Analyseer flow met badges en samenvatting, buiten-scope footer, reload persistence, oude shape reset, styling conformance)
- **Phase 13 doel bereikt:** focusview rond eerste doel met AI-review voor hefboomwerking en baten-dekking, oude totaaloverzicht verwijderd, buiten-scope inklapbaar

## Task Commits

1. **Task 1: STEP_INFO[5] update + restore guard + CTA condition** — `cbd2285` (feat)
   - 15 insertions, 8 deletions in CrossAnalyseWizard.tsx
2. **Task 2: End-to-end UAT human-verify checkpoint** — `1a722b1` (test, empty commit marking UAT approval)

**Plan metadata (this SUMMARY + STATE + ROADMAP):** wordt gecommit als `docs(13-04): complete wave-3-wizard-integratie plan`

## Files Created/Modified

- `src/components/cross-analyse/CrossAnalyseWizard.tsx` — 4 wijzigingen:
  - Line 14: `import { restoreStap5Result } from "@/lib/stap5-focus";` toegevoegd
  - Lines ~75-82: `STEP_INFO[5]` bijgewerkt met UI-SPEC copywriting contract (title, description, placeholder, analyseLabel, loadingTitle, loadingDescription)
  - Lines ~97-113: restore `useEffect` valideert `wizData.stepResults?.stap5` via `restoreStap5Result(...)` en spread resulterende waarde in nieuwe stepResults
  - Line ~437: CTA conditional `wizardState.currentStep <= 4 && !error` → `wizardState.currentStep <= 5 && !error`

## Decisions Made

Alle decisions voor deze plan waren reeds gelockt in Phase 13 research/context:
- **D-10 restore guard locatie:** CrossAnalyseWizard useEffect i.p.v. session-context loadSession (schema-validatie op gebruiksniveau — kleine, chirurgische fix i.p.v. grote refactor)
- **Open Question 2 CTA fix:** `<= 5` predicate extensie i.p.v. speciale stap5-branch (minst-invasieve optie, conform RESEARCH locked decision)
- **D-11 copy:** UI-SPEC Copywriting Contract is de single source of truth voor alle STEP_INFO velden

## Deviations from Plan

None — plan executed exactly as written. De 4 wijzigingen (import + STEP_INFO + restore useEffect + CTA condition) zijn precies conform de `<action>` specificatie uitgevoerd.

## Issues Encountered

None tijdens Task 1. Build + lint + vitest alle groen in één run. UAT Task 2 bevestigde dat alle 10 checks conform zijn.

**Bestaande out-of-scope testfailure:** `src/lib/schemas.test.ts:395` had 1 pre-existing failure (229/230 groen) die NIET gerelateerd is aan Phase 13. Gelogd in `deferred-items.md` — scope boundary respected (Rule: alleen fixen wat direct door huidige taak veroorzaakt is).

## Verification Results

**Automated (pre-UAT):**
- `npm run build`: GROEN
- `npm run lint`: GROEN
- `npx vitest run`: 229/230 groen (1 pre-existing unrelated failure, niet Phase 13)
- Specifiek: alle 23 Wave 0 tests (schemas-stap5, stap5-focus-filter, stap5-restore-guard) GROEN
- Grep checks allemaal conform:
  - `restoreStap5Result` appears 2x (import + call)
  - `Prioriteitsview — eerste doel` appears 1x
  - `Analyseer eerste doel` appears 1x
  - `currentStep <= 5` appears 1x
  - `currentStep <= 4` appears 0x
  - `Nieuw DIN-netwerk` appears 0x

**Manual UAT (Task 2 — 10 checks):**
1. ✓ Stap 5 header toont "Prioriteitsview — eerste doel" met beschrijvende tekst over hefboomwerking
2. ✓ Focusdoel card toont doel met laagste rank met #003366 accent
3. ✓ Baten per sector gegroepeerd (PO/VO/Zakelijk), alleen baten onder focus-doel, accent #0066cc, placeholder dots met juiste aria-label
4. ✓ Cross-sector vermogens alleen met relatedSectors.length > 1, accent #0891b2, sector badges rechts
5. ✓ Gedeelde inspanningen met comma in responsibleSector, accent #059669
6. ✓ Empty state copy verschijnt zoals gespecificeerd
7. ✓ "Analyseer eerste doel" CTA zichtbaar, loading overlay, badges (geraakt/risico/dekt volledig/moet verbreed/mist aspect), hefboomAnalyse, AI-samenvatting — geen content jump
8. ✓ Buiten-scope footer inklapbaar, toont simpele lijst met titel + SectorBadge, geen cards
9. ✓ Page reload behoudt AI-resultaten via localStorage cache
10. ✓ Styling conform: neutrale achtergronden, linker accenten, ingetogen zakelijk uiterlijk

## Known Stubs

None. Alle focusview secties zijn wired aan echte data via de reeds bestaande helpers (`getFocusGoal`, `computeFocusView`) uit Wave 1, en AI-callouts komen via de reeds bestaande `/api/cross-analyse` route (stap=5 tak) uit Wave 2. Geen hardcoded empty values, geen placeholder text die naar gebruiker lekt, geen mock data.

## Phase 13 Totaal-overzicht

Dit plan sluit Phase 13 af. Volledige file manifest over alle 4 plannen:

**Toegevoegd (NEW):**
- `src/lib/stap5-focus.ts` — pure helpers module (Wave 1 / plan 13-02)
- `src/lib/__tests__/stap5-focus-filter.test.ts` — Wave 0 tests (plan 13-01)
- `src/lib/__tests__/stap5-restore-guard.test.ts` — Wave 0 tests (plan 13-01)
- Test contract file voor Stap5ResultSchema — Wave 0 tests (plan 13-01)

**Gewijzigd (MODIFIED):**
- `src/lib/schemas.ts` — Stap5ResultSchema vervangen (plan 13-02)
- `src/lib/prompts.ts` — CROSS_ANALYSE_STAP5_PROMPT herschreven (plan 13-02)
- `src/app/api/cross-analyse/route.ts` — stap===5 payload narrowing (plan 13-03)
- `src/components/cross-analyse/StapSectorVertaling.tsx` — volledig herschreven naar 6-block focusview (plan 13-03)
- `src/components/cross-analyse/CrossAnalyseWizard.tsx` — restore guard + STEP_INFO[5] + CTA condition (plan 13-04, dit plan)

**Totaal:** 4 plannen, 23 Wave 0 tests GROEN, 6 kern-bestanden gewijzigd, 1 nieuw pure module bestand (stap5-focus.ts), 2-3 test bestanden toegevoegd.

## Next Phase Readiness

Phase 13 is volledig afgesloten. Phase 14 (Lopende projecten promoveren tot volwaardige inspanningen) kan starten — deze bouwt voort op de Phase 12 ExternalProject data en kan de cross-analyse stap 5 focusview als context gebruiken voor project-promotie beslissingen. Geen blockers.

## Self-Check: PASSED

- Files modified exists: `src/components/cross-analyse/CrossAnalyseWizard.tsx` — FOUND
- Commit `cbd2285` (Task 1) — FOUND in git log
- Commit `1a722b1` (Task 2 UAT) — FOUND in git log
- SUMMARY.md being written at `.planning/phases/13-stap-5-cross-analyse-prioriteitsview-eerste-doel/13-04-SUMMARY.md`

---
*Phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel*
*Plan: 04*
*Completed: 2026-04-05*
