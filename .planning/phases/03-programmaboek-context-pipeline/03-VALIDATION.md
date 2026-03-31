---
phase: 3
slug: programmaboek-context-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
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
| 03-01-01 | 01 | 1 | AI-01e | unit | `npx vitest run scripts/__tests__/extract-programmaboek.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | AI-01a | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "baten"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | AI-01b | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "vermogens"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | AI-01c | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "inspanningen"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | AI-01d | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "truncat"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/prompt-assembly.test.ts` — stubs for AI-01a through AI-01d
- [ ] `scripts/__tests__/extract-programmaboek.test.ts` — stubs for AI-01e
- [ ] Framework already configured (`vitest.config.ts` exists with path aliases)

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prompt/book discrepancy review | AI-01 (D-06) | Requires human judgement on methodology accuracy | Compare existing prompt text against extracted book sections; approve or reject changes |
| AI output quality with context | AI-01 | Subjective quality assessment | Generate baten/vermogens/inspanningen with context injected; verify output references methodology |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
