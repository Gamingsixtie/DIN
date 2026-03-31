---
phase: 2
slug: state-management-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | DATA-03-a | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -t "functional updater" -x` | No -- Wave 0 | ⬜ pending |
| 02-01-02 | 01 | 0 | DATA-03-b | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -t "rapid updates" -x` | No -- Wave 0 | ⬜ pending |
| 02-01-03 | 01 | 0 | DATA-03-c | unit | `npx vitest run src/lib/__tests__/persistence.test.ts -t "returns boolean" -x` | No -- Wave 0 | ⬜ pending |
| 02-01-04 | 01 | 0 | DATA-03-d | unit | `npx vitest run src/lib/__tests__/persistence.test.ts -t "empty array" -x` | No -- Wave 0 | ⬜ pending |
| 02-01-05 | 01 | 0 | DATA-03-e | manual | Manual: edit session, reload, verify data | N/A | ⬜ pending |
| 02-01-06 | 01 | 0 | DATA-03-f | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -t "toast on failure" -x` | No -- Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/session-context.test.ts` — stubs for DATA-03-a, DATA-03-b, DATA-03-f (functional updater, rapid updates, toast on failure)
- [ ] `src/lib/__tests__/persistence.test.ts` — stubs for DATA-03-c, DATA-03-d (boolean return, empty array save)
- [ ] Vitest install + config — `vitest.config.ts` if no framework detected

*Note: Testing React Context hooks should test pure logic (updater functions) in isolation. Persistence tests are pure functions needing no additional test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session data survives page reload | DATA-03-e | Requires browser environment with full page lifecycle | 1. Open session, make edits 2. Reload page (F5) 3. Verify all data including sectoranalyses and DIN-mappings intact |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
