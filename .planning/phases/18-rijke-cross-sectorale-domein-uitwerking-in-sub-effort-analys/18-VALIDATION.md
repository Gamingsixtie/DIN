---
phase: 18
slug: rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 18-RESEARCH.md §Validation Architecture. Refine during planning.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest `^4.1.2` |
| **Config file** | `vitest.config.ts` (include pattern `src/**/*.test.ts` — `.tsx` excluded) |
| **Quick run command** | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Build gate** | `npm run build` (CLAUDE.md verplicht) |
| **Estimated runtime** | ~2 seconds quick / ~10 seconds full |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts`
- **After every plan wave:** `npx vitest run` + `npm run build`
- **Before `/gsd-verify-work`:** Full suite green + build exit 0 + human UAT cases passed
- **Max feedback latency:** 2 seconds (quick) / 60 seconds (full+build)

---

## Per-Task Verification Map

> To be populated by planner — one row per task in *-PLAN.md files.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 0 | R-CROSS-03 | — | N/A | unit | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extend `src/lib/__tests__/cross-analyse-schema.test.ts` with `describe("SubEffortAdviesSchema Phase 18 rijke uitwerking")` covering:
  - Rich fields accepted (titel, beschrijving, beargumentatie, vermogenImpact[], dossier{})
  - Backward-compat: Phase 17 shape still parses under extended schema
  - `vermogenImpact` entry rejects invalid sectorId
  - `dossier` accepts partial values (defaults to empty string)
  - Demo-data `stap4Result` parses via `Stap4ResultSchema`
- [ ] No new test file needed; no conftest equivalent
- [ ] No framework install needed (vitest + zod present)

---

## Manual-Only Verifications

Rendering tests require `.tsx` inclusion which is out of scope — human UAT covers UI verification (Phase 17 pattern).

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rijke kaart rendert met 5 blokken per domein | R-CROSS-03 | vitest config sluit `.tsx` uit | Open demo-sessie → cross-analyse → stap 5 sector-vertaling → per groep × domein verify titel + beschrijving + beargumentatie + vermogenImpact[] + dossier-veld |
| Dossier expand/collapse zonder layout-shift | R-CROSS-03 | visuele/interactie regressie | Klik dossier-expand toggle; meet CLS visueel |
| Backward-compat sessie (geen rijke velden) rendert fallback | R-CROSS-03 | sessie-roundtrip niet in unit test | Laad Phase 17 sessie zonder rijke velden; verify fallback rendering zonder crash |
| Grid-responsiviteit mobile/tablet/desktop | R-CROSS-03 | viewport-check | Resize naar 375/768/1440 breedtes; verify leesbaarheid zonder overflow |
| API stap 4 user-message bevat `focusDoel` block | R-CROSS-03 | supertest niet in stack | `npm run dev`; trigger stap 5 analyse; inspecteer server-log voor focusDoel in user-message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all schema-level requirements (R-CROSS-03-a..e)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter after planner assigns task IDs

**Approval:** pending
