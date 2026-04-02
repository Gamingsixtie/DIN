---
phase: 7
slug: dutch-tokenizer-similarity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | CROSS-04a | unit | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "compound"` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | CROSS-04b | unit | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "threshold"` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | CROSS-04c | unit | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "filter"` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | CROSS-04d | integration | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "cluster"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/nl-tokenizer.test.ts` — stubs for CROSS-04 (compound splitting, threshold, token filtering, cluster integration)
- [ ] Framework install: none needed (vitest 4.1.2 already configured)

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
