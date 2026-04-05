---
phase: 14
slug: lopende-projecten-promoveren-tot-volwaardige-inspanningen-in-din-keten-met-splitsing-en-bevindingen-afleiding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing — see `src/lib/__tests__/`) |
| **Config file** | `vitest.config.ts` (or inherited from repo root — planner to confirm) |
| **Quick run command** | `npx vitest run src/lib/__tests__/project-promotion` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~15 seconds (unit) + ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/project-promotion`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

*Populated during planning — planner fills in task IDs and commands once PLAN.md files are written.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | D-08/D-09 | unit (schema) | `npx vitest run src/lib/__tests__/external-project-schema.test.ts` | ✅ (extend) | ⬜ pending |
| 14-01-02 | 01 | 1 | D-14 | unit (schema) | `npx vitest run src/lib/__tests__/project-promotion-schema.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | D-10/D-11 | unit (mutation) | `npx vitest run src/lib/__tests__/project-promotion.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | D-02/D-05 | integration (AI client) | `npx vitest run src/lib/__tests__/ai-client-promotion.test.ts` (mocked) | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 3 | D-01/D-02/D-13 | build + manual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Planner MUST replace this table with actual task IDs from generated PLAN.md files before execution.*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/project-promotion-schema.test.ts` — new file with stubs for `ProjectPromotieResultSchema`, `FindingSuggestionSchema`, `promotedAt`/`promotedToEffortIds`/`originProjectId` fields (D-08, D-09, D-14)
- [ ] `src/lib/__tests__/project-promotion.test.ts` — new file with stubs for `promoteProjectToEfforts()` and `undoProjectPromotion()` pure functions (D-10, D-11) — mirror `consolidation.test.ts` structure
- [ ] `src/lib/__tests__/external-project-schema.test.ts` — extend existing file with Tests 11-16 for new optional fields
- [ ] Vitest framework is already installed (verified in package.json via existing `__tests__` directory)

*No new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Promotion button visibility on project card | D-01 | UI placement/visibility requires visual inspection | 1. Load sessie with external projects (Phase 12 data), 2. Open DIN-Mapping step, 3. Confirm "Promoveer"-knop visible on each project card with non-promoted state |
| AI review panel shows full DIN chain | D-02, D-13 | Visual layout of benefit → capability → efforts → findings in one screen | 1. Click promoveer on a project, 2. Verify review panel shows: benefit matches with AI rationale, capability matches, 1-4 proposed efforts with all fields pre-filled, findings section with type chips |
| Findings click-to-add creates new entity | D-13, D-14 | DOM state + session mutation interplay | 1. In review panel, click "Voeg toe aan DIN" on a finding, 2. Confirm new entity appears in correct list (baten/vermogens/inspanningen), 3. Confirm finding removed from transient list |
| Promoted project disappears from active list, reappears with toggle | D-08 | Dual filter sites at DINMappingStep §1783 and §1833 | 1. Promote a project, 2. Confirm it disappears from lopende projecten lijst, 3. Toggle "Toon gepromoveerde projecten", 4. Confirm it reappears with "gepromoveerd" badge |
| Undo restores original state | D-11 | Mapping reconstruction correctness | 1. Promote a project, 2. Open promoted project detail, 3. Click "Terugdraaien", 4. Confirm: efforts deleted, projectCapabilityMaps restored, promotedAt cleared, project back in active list |
| `npm run build` passes after all changes | CLAUDE.md kwaliteitseis | Full TypeScript + Next.js build gate | Run `npm run build`, confirm exit 0, no TypeScript errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new test files stubbed)
- [ ] No watch-mode flags (use `vitest run` not `vitest`)
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter (flip after planner fills task IDs)

**Approval:** pending
