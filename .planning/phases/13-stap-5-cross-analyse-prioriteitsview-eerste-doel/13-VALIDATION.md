---
phase: 13
slug: stap-5-cross-analyse-prioriteitsview-eerste-doel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `13-RESEARCH.md` → Validation Architecture section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 (already in `devDependencies`) |
| **Config file** | `vitest.config.ts` (include: `src/**/*.test.ts`, `@` alias active) |
| **Quick run command** | `npx vitest run src/lib/__tests__/stap5-*.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Lint command** | `npm run lint` |
| **Build / type-check** | `npm run build` (Next.js strict TS compile) |
| **Estimated runtime** | ~5–15 seconds (small focused test suite) |

No framework install required — Vitest is already present and configured.

---

## Sampling Rate

- **After every task commit:** `npm run lint && npm run build` + any `stap5-*.test.ts` relevant to the changed files
- **After every plan wave:** `npx vitest run` (full suite) + `npm run build`
- **Before `/gsd:verify-work`:** Full vitest suite green + `npm run build` green + manual UAT checklist from plan-artefact §Verificatie
- **Max feedback latency:** < 30 seconds per task commit

---

## Per-Task Verification Map

> Filled in by planner. Each task in a PLAN.md must map to exactly one row here (or reference a Wave 0 test file) so sampling continuity holds (no 3 consecutive tasks without automated verify).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | TBD | 0 | D-05, D-07 | unit | `npx vitest run src/lib/__tests__/schemas-stap5.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | TBD | 0 | R-CROSS-01, R-CROSS-02, D-01 | unit | `npx vitest run src/lib/__tests__/stap5-focus-filter.test.ts` | ❌ W0 (conditional) | ⬜ pending |
| 13-01-03 | TBD | 0 | D-10 | unit | `npx vitest run src/lib/__tests__/stap5-restore-guard.test.ts` | ❌ W0 (conditional) | ⬜ pending |
| 13-NN-NN | TBD | N | — | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Mandatory:**
- [ ] `src/lib/__tests__/schemas-stap5.test.ts` — verify new `Stap5ResultSchema.safeParse` accepts the new shape AND rejects the old `sectorVertalingen[]` shape (D-05, D-07 regression guard)

**Conditional (required IF executor extracts pure helpers — strongly recommended for testability):**
- [ ] `src/lib/__tests__/stap5-focus-filter.test.ts` — unit tests for `getFocusGoal(goals)` (rank sort + fallback) and `computeFocusView(session)` (cross-sector baten/vermogens/inspanningen filter). Mandatory if helpers extracted to `src/lib/stap5-focus.ts` or `din-service.ts`.
- [ ] `src/lib/__tests__/stap5-restore-guard.test.ts` — only if `CrossAnalyseWizard.tsx:98-113` restore logic is extracted to a pure `restoreWizardState(session)` helper. Otherwise covered by manual UAT (D-10 migration check).

**Framework install:** Not required — Vitest 4.1.2 already in `devDependencies`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| API route `stap === 5` payload narrowing returns only focus-view | D-09 | No API-route unit tests exist in codebase (project pattern) | `npm run dev` → trigger Stap 5 Analyseer → inspect network response, verify JSON matches new `Stap5ResultSchema` |
| Empty states render correctly: (a) geen doelen, (b) geen cross-sector vermogens, (c) geen AI-resultaat (pre-Analyseer) | D-12 | Codebase has no React Testing Library (verified: `@testing-library/*` NOT in devDependencies) | `npm run dev` → stap 5 UAT checklist: create session with 0 goals, then with 1 goal no capabilities, then pre-Analyseer view |
| Baten per sector badges render with exact `SECTOR_COLORS` tokens (Cito branding) | D-06 | Visual verification | `npm run dev` → stap 5 → verify each sector badge matches `SECTOR_COLORS` in `src/lib/types.ts` |
| AI review output (`hefboomAnalyse`, `breedteOordeel` tekst, `wordtGeraakt` met risicoRedenering, `samenvatting`) renders per UI-SPEC | D-04, D-08 | End-to-end visual + content check | `npm run dev` → trigger real Claude call → verify all 4 content slots populated and rendered |
| "Buiten scope" inklapbare sectie toont niet-geconsolideerde items met sector badges only (no tooltips) | D-03 | Visual + interaction | `npm run dev` → stap 5 → collapse/expand buiten-scope footer |
| Wizard Analyseer CTA visible on step 5 (line 437 condition changed to `<= 5`) and `STEP_INFO[5]` populated | Open Question 2 → locked | Integration of wizard chrome + stap 5 view | `npm run dev` → navigate to stap 5 → CTA button visible, click triggers analyse |
| AI contract robustness: `breedteOordeel` always one of enum values, handled by `callClaudeWithValidation` 2-retry | AI contract | Runtime probabilistic behavior | Monitor `console.error` during UAT; if 422 repeatedly, adjust prompt |

---

## Validation Sign-Off

- [ ] All plan tasks have `<automated>` verify command or reference a Wave 0 test file
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (lint+build counts as automated baseline)
- [ ] Wave 0 covers all MISSING test references declared above
- [ ] No watch-mode flags (`vitest run`, never `vitest` alone)
- [ ] Feedback latency < 30s per commit
- [ ] `nyquist_compliant: true` set in frontmatter once plans are finalized and all tasks map to this document
- [ ] `wave_0_complete: true` set once Wave 0 test files exist and pass

**Approval:** pending
