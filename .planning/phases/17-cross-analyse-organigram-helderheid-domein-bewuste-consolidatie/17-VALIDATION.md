---
phase: 17
slug: cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (alias `@/` → `./src`, include `src/**/*.test.ts`) |
| **Quick run command** | `npx vitest run src/lib/__tests__/consolidation.test.ts src/lib/__tests__/cross-analyse-schema.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Build verify** | `npm run build` |
| **Lint** | `npm run lint` |
| **Estimated runtime** | ~3-5s quick / ~30-60s full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/consolidation.test.ts src/lib/__tests__/cross-analyse-schema.test.ts`
- **After every plan wave:** Run `npx vitest run && npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite + build + lint must be green, plus human-verify UI checkpoint
- **Max feedback latency:** 5 seconds per task, 60 seconds per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 0 | R-CROSS-02 | schema | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "gelijkenis groep"` | ❌ W0 (extend) | ⬜ pending |
| 17-01-02 | 01 | 0 | R-CROSS-02 | schema | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "backward compat"` | ❌ W0 (extend) | ⬜ pending |
| 17-01-03 | 01 | 0 | R-CROSS-02 | schema | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "markeer_gelijkenis"` | ❌ W0 (extend) | ⬜ pending |
| 17-01-04 | 01 | 0 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "auto apply skip failure"` | ❌ W0 (new helper + test) | ⬜ pending |
| 17-02-01 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "title guard rejects sector name"` | ✅ extend | ⬜ pending |
| 17-02-02 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "title guard min length"` | ✅ extend | ⬜ pending |
| 17-02-03 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "word boundary false positives"` | ✅ extend | ⬜ pending |
| 17-02-04 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "domain guard rejects"` | ✅ extend | ⬜ pending |
| 17-02-05 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "domain guard accepts"` | ✅ extend | ⬜ pending |
| 17-02-06 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "drieluik threshold throws"` | ✅ extend | ⬜ pending |
| 17-02-07 | 02 | 1 | R-CROSS-02 | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "drieluik threshold accepts"` | ✅ extend | ⬜ pending |
| 17-03-01 | 03 | 2 | R-CROSS-01 | build | `npm run build` | ✅ existing | ⬜ pending |
| 17-03-02 | 03 | 2 | R-CROSS-01 | schema | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "sub effort advies"` | ❌ W0 | ⬜ pending |
| 17-04-01 | 04 | 3 | R-CROSS-01 | manual-ui | Human verify drieluik render + hefboom-badge tooltip | N/A | ⬜ pending |
| 17-04-02 | 04 | 3 | R-CROSS-01 | manual-ui | Human verify guard error banner bij cross-domein merge | N/A | ⬜ pending |
| 17-04-03 | 04 | 3 | R-CROSS-01 | manual-ui | Human verify herzie-advies regen + context-textarea | N/A | ⬜ pending |
| 17-04-04 | 04 | 3 | R-CROSS-01 | manual-ui | Human verify auto-apply "N samengevoegd, M review" toast | N/A | ⬜ pending |
| 17-04-05 | 04 | 3 | R-CROSS-01 | manual-ui | Human verify domein-balans badge "Dekt N van 4 — mist X" kleur | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/consolidation-guards.ts` — nieuw bestand met pure helpers: `validateNeutralTitle()`, `validateDomainHomogeneity()`, `validateDrieluikThreshold()`, `extractAutoApplyResult()`
- [ ] `src/lib/__tests__/cross-analyse-schema.test.ts` — uitbreiden of nieuw bestand voor schema-tests (`VermogenGelijkenisGroepSchema`, `Stap2ResultSchema` backward compat, `markeer_gelijkenis` enum, `SubEffortAdviesSchema`, `Stap4ResultSchema` backward compat)
- [ ] `src/lib/__tests__/consolidation.test.ts` — uitbreiden met 7+ nieuwe cases per D-24 (title-guard, domain-guard, drieluik-threshold, word-boundary, min-length, auto-apply helper)
- [ ] `npm ls zod vitest` verificatie — expliciet maken van dependencies; als `zod` impliciet → `npm install zod` + commit
- [ ] **No new framework install** — vitest reeds actief, 20 test-files draaien groen

*Wave 0 moet afsluiten met groene quick-run voordat Wave 1 start.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drieluik-rendering per `VermogenGelijkenisGroep` (3 parallelle sector-vermogen-kaarten) | R-CROSS-01 | Visueel layout-gedrag | Open een sessie met stap 4 voltooid; ga naar stap 5 organigram; verifieer: 3 kaarten naast elkaar (desktop) / gestapeld (mobile), elk met `SectorBadge` PO/VO/Zakelijk, onderscheidbare sector-kleuren |
| Hefboom-badge op gebundelde inspanning toont tooltip met 3 vermogens | R-CROSS-01 | Tooltip-interactie | Hover over "Hefboom: raakt 3 sectoren"-badge onder een gebundelde inspanning; verifieer tooltip somt de 3 sector-vermogens op |
| Guard-error banner bij cross-domein merge | R-CROSS-02 | UI state transition | In stap 4 forceer een cross-domein merge via manual-merge knop; verifieer: rode error-banner boven actieknoppen met tekst `'Cross-domein merge geblokkeerd: mens + data_systemen'`, Combineren-knop disabled |
| Guard-error banner bij sector-specifieke titel | R-CROSS-02 | UI state transition | In stap 4 hernoem voorgesteldeNaam naar "Training PO-leerkrachten"; probeer merge; verifieer: rode error-banner met tekst over sector-naam, knop disabled |
| Herzie-advies knop met context-textarea | R-CROSS-01 | End-to-end AI-flow | Klik "Herzie advies" op een cluster; typ context "focus op data-domein"; verifieer: inline spinner op knop, textarea disabled tijdens call; na return overschrijft nieuwe advies het cluster, context is zichtbaar onder cluster |
| Auto-apply summary toast "N samengevoegd, M vereisen review" | R-CROSS-02 | UI feedback | Load stap 4 met gemengde clusters (valid + guard-fail); verifieer: toast toont correcte counts; guard-failers hebben "Vereist review" badge (rode border-l) op ClusterCard |
| Domein-balans badge kleur-conventie | R-CROSS-01 | Visueel | Per `VermogenGelijkenisGroep` in organigram: verifieer badge-kleur groen (dekt ≥3 domeinen), amber (2), rood (≤1); tekst `"Dekt N van 4 domeinen — mist X"` |
| Legacy-sessie warning badge | R-CROSS-02 | Legacy data detection | Load een bestaande sessie met oude `consolidated: true` caps; verifieer: amber `"Legacy: vermogens-merge"` badge op kaart; geen crash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (consolidation-guards.ts, cross-analyse-schema.test.ts, pure helper)
- [ ] No watch-mode flags (use `vitest run`, niet `vitest`)
- [ ] Feedback latency < 60s per wave, <5s per task
- [ ] `nyquist_compliant: true` set in frontmatter after all task verifies green

**Approval:** pending
