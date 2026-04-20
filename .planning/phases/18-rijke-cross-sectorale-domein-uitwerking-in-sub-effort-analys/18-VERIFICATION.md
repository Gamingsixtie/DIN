---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
verified: 2026-04-20T21:14:00Z
status: passed
score: 6/6 must-haves verified
re_verification:
  previous_status: none
  previous_score: n/a
---

# Phase 18: Rijke cross-sectorale domein-uitwerking in sub-effort-analyse — Verification Report

**Phase Goal:** AI cross-analyse stap 4 sub-effort adviezen dragen focus-doel-geankerde titel/beschrijving/beargumentatie + per-sector vermogenImpact + Inspanningendossier; `StapSectorVertaling.tsx` rendert deze rijke velden met expand/collapse dossier; demo-data parseert onder het nieuwe schema; backward-compat met Phase 17 houdt stand.
**Verified:** 2026-04-20
**Status:** PASS

## Goal Achievement — Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Schema accepteert rijke velden + backward-compat | VERIFIED | `src/lib/schemas.ts` L327-366: `SubEffortVermogenImpactSchema`, `SubEffortDossierSchema` met `.optional().default("")` per veld, `SubEffortAdviesSchema` uitgebreid met 5 optionele velden — Phase 17 shape blijft geldig. |
| 2 | Prompt verankert focus-doel + Hfst 11.3 dossier | VERIFIED | `src/lib/prompts.ts` L360-420: `SUB_EFFORT_ANALYSE_PROMPT` bevat "FOCUS-DOEL VERANKERING" (L372), "SECTOR-CONTEXT VERANKERING" (L377), Hfst 11.3 referentie (L417), Nederlandse rolnamen (Directie L&D, Programmamanager, CIO, IT-architect) en € in kostenraming-voorbeeld (L403). |
| 3 | Route stap 4 levert focusDoel + groepVermogensRich aan AI met 8192 tokens | VERIFIED | `src/app/api/cross-analyse/route.ts` L244-325: `focusDoelContext` met name-fallback (L254-263), `groepVermogensRich` met `profielHuidig`/`profielGewenst` (L299-308), `subUserMessage` bevat `focusDoel` als eerste key (L312), `maxTokens: 8192` (L325). |
| 4 | Demo-data bevat 4 verrijkte subEffortAnalysis entries die onder Stap4ResultSchema parseren | VERIFIED | `src/lib/demo-data.ts` L755-951: 4 entries (mens/cultuur/data_systemen/processen) met titel, beschrijving, beargumentatie die expliciet naar focus-doel "Integraal klantbeeld en outside-in werken als strategisch fundament" verwijzen, vermogenImpact-mapping PO→capIds[1]/VO→capIds[2]/Zakelijk→capIds[0], dossier met € (L799, 847, 893, 942). Schema-test "demo-data stap4Result.subEffortAnalysis parseert onder Stap4ResultSchema" GREEN. |
| 5 | Renderer toont rijke velden met expand/collapse dossier + backward-compat | VERIFIED | `src/components/cross-analyse/StapSectorVertaling.tsx` L49-143 definieert `VermogenImpactSectie` + `DossierSectie` (useState(false), aria-expanded/controls, ▸/▾ glyphs, focus-ring, data-testid hooks); L458 grid `lg:grid-cols-2`; L520-573 conditional rendering per Phase 18 veld + legacy `!advies.beargumentatie && advies.reden` fallback. |
| 6 | Automated gate green — schema tests 30/30 pass, Phase 18 source TS-clean | VERIFIED | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` → **30 passed (30)** incl. 5 rijke-uitwerking tests, 2 Stap4 integratie tests en backward-compat test. `npx tsc --noEmit` toont geen errors in schemas.ts, prompts.ts, route.ts, demo-data.ts of StapSectorVertaling.tsx (pre-existing errors enkel in ongerelateerde test-fixtures, zoals genoemd in taak-context). |

**Score:** 6/6 truths verified

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/schemas.ts` | 2 nieuwe sub-schemas + 5 nieuwe optional velden | VERIFIED | Exports `SubEffortVermogenImpactSchema`, `SubEffortDossierSchema`, types `SubEffortVermogenImpact`, `SubEffortDossier`. |
| `src/lib/prompts.ts` | Rewritten SUB_EFFORT_ANALYSE_PROMPT | VERIFIED | Alle verplichte ankers aanwezig; andere prompts ongewijzigd. |
| `src/app/api/cross-analyse/route.ts` | stap 4 branch met focusDoel + rich vermogens + 8192 tokens | VERIFIED | Scoped binnen `if (stap === 4)`; `getFocusGoal` + name-fallback (R5). |
| `src/lib/demo-data.ts` | 4 enriched subEffortAnalysis entries met € | VERIFIED | 4 domeinen × 5 rijke velden; €-symbool in kostenraming en beargumentatie. |
| `src/components/cross-analyse/StapSectorVertaling.tsx` | VermogenImpactSectie + DossierSectie + grid-cols-2 + backward-compat | VERIFIED | Helpers geïmplementeerd; disclaimer "Rolnamen zijn AI-voorstel" aanwezig. |
| `src/lib/__tests__/cross-analyse-schema.test.ts` | 7 nieuwe tests Phase 18 | VERIFIED | 30/30 GREEN. |

## Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| StapSectorVertaling.tsx | schemas.ts (SubEffortDossier, SubEffortVermogenImpact) | type import | WIRED (L19-20) |
| StapSectorVertaling.tsx | shared/SectorBadge | `<SectorBadge sector={v.sectorId} />` | WIRED (L69) |
| route.ts stap 4 | SUB_EFFORT_ANALYSE_PROMPT | `assembleSystemPrompt(SUB_EFFORT_ANALYSE_PROMPT, …)` | WIRED (L292) |
| route.ts stap 4 | SubEffortAdviesSchema | `callClaudeWithValidation(z.array(SubEffortAdviesSchema), …)` | WIRED (L322) |
| demo-data.ts subEffortAnalysis | Stap4ResultSchema | parse test in cross-analyse-schema.test.ts | WIRED (GREEN) |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 18 schema + demo-data tests green | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` | 30 passed (30) | PASS |
| Phase 18 source files TS-clean | `npx tsc --noEmit` filtered op Phase 18 files | 0 errors | PASS |

## Human Verification Required

Niet blokkerend voor PASS — de VALIDATION-matrix merkt vier UAT-items als manueel (Phase 17 pattern: `.tsx` uitgesloten in vitest-config). Gebruiker kan demo laden via `npm run dev` om visueel te bevestigen: (a) 5 blokken per domein-kaart, (b) dossier expand/collapse zonder layout-shift, (c) Phase 17-sessie zonder rijke velden rendert via legacy fallback, (d) grid-responsiviteit 375/768/1440.

## Gaps Summary

Geen gaps. Alle 6 must-haves VERIFIED. De 8 bekende testsuite-failures buiten Phase 18 (persistence.test.ts, stap5-focus-filter.test.ts, schemas.test.ts DINSessionSchema) zijn pre-existing bij fase-start en staan in de dirty working tree — niet toegerekend per expliciete taak-instructie.

---

_Verified: 2026-04-20T21:14:00Z_
_Verifier: Claude (gsd-verifier)_
