---
phase: 9
slug: wizard-cleanup-export-voorbereiding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | EXP-04 | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -x` | Existing (needs update) | ⬜ pending |
| 09-01-02 | 01 | 1 | EXP-04 | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -x` | Needs new test case | ⬜ pending |
| 09-01-03 | 01 | 1 | EXP-04 | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -x` | Existing (needs update) | ⬜ pending |
| 09-01-04 | 01 | 1 | EXP-04 | smoke | `npm run build` | N/A (build command) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New test case in `src/lib/__tests__/schemas.test.ts`: verify DINSessionSchema parses legacy data containing `integratieAdvies` field without error (field is silently stripped)
- [ ] Update existing `src/lib/__tests__/session-context.test.ts` fixture: remove `integratieAdvies: {}`

*Existing infrastructure covers most phase requirements. Two test updates needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wizard flow navigates smoothly without integratieadvies step | EXP-04 | Visual navigation flow | Navigate through all 6 wizard steps, verify no gaps or broken transitions |
| DINMappingStep UI layout correct after panel removal | EXP-04 | Visual layout | Open DINMappingStep, verify layout fills space correctly without advies panel |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
