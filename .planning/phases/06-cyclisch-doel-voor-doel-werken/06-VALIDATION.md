---
phase: 6
slug: cyclisch-doel-voor-doel-werken
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | CYCL-01 | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | CYCL-01 | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | CYCL-03 | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | CYCL-02 | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -x` | Extend | ⬜ pending |
| 06-02-02 | 02 | 2 | CYCL-02 | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -x` | Extend | ⬜ pending |
| 06-02-03 | 02 | 2 | CYCL-02 | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -x` | Extend | ⬜ pending |
| 06-ALL | ALL | ALL | ALL | integration | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/goal-completion.test.ts` — stubs for CYCL-01, CYCL-03 (checkSectorChain, isGoalComplete, getGoalCompletionStatus)
- [ ] Extend `src/lib/__tests__/prompt-assembly.test.ts` — covers CYCL-02 (buildCompletedGoalsContext)

*Existing test infrastructure (Vitest, tsconfig path aliases, test patterns) is sufficient.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar status-badges render correctly | CYCL-03 | Visual UI rendering | Open DIN-mapping, verify badges show afgerond/bezig/niet-begonnen per goal |
| "Doel afronden" button enables/disables correctly | CYCL-01 | Interactive UI state | Complete a full chain in all sectors, verify button becomes active |
| Auto-advance to next goal after afronden | CYCL-01 | UI interaction flow | Click "Doel afronden", verify sidebar selects next unfinished goal |
| Per-sector mini-status in sidebar | CYCL-03 | Visual rendering | Partially complete a goal, verify PO/VO/Zak status indicators |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
