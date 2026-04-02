---
phase: 1
slug: zod-schema-validatie
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | none — see Wave 0 |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | DATA-02 | infra | `npx vitest run` | No — Wave 0 | pending |
| 01-02-01 | 02 | 1 | DATA-02a | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -t "schema structure"` | No — Wave 0 | pending |
| 01-02-02 | 02 | 1 | DATA-02f | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -t "legacy"` | No — Wave 0 | pending |
| 01-03-01 | 03 | 1 | DATA-02b | unit | `npx vitest run src/lib/__tests__/ai-parsing.test.ts -t "extractJSON"` | No — Wave 0 | pending |
| 01-03-02 | 03 | 1 | DATA-02c | unit | `npx vitest run src/lib/__tests__/ai-parsing.test.ts -t "parseAIResponse"` | No — Wave 0 | pending |
| 01-03-03 | 03 | 1 | DATA-02d | unit | `npx vitest run src/lib/__tests__/ai-parsing.test.ts -t "retry"` | No — Wave 0 | pending |
| 01-04-01 | 04 | 2 | DATA-02e | unit | `npx vitest run src/lib/__tests__/kib-import.test.ts` | No — Wave 0 | pending |
| 01-05-01 | 05 | 3 | DATA-02g | integration | `npm run build` | N/A (build) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — vitest configuration with path aliases matching `tsconfig.json`
- [ ] `npm install -D vitest@^4.1.2` — dev dependency
- [ ] `src/lib/__tests__/schemas.test.ts` — schema structure tests, legacy data tests
- [ ] `src/lib/__tests__/ai-parsing.test.ts` — extractJSON, parseAIResponse, retry logic tests
- [ ] `src/lib/__tests__/kib-import.test.ts` — KiB import validation tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User sees Dutch error message after 2 retries | DATA-02 (D-02) | Requires UI interaction | Trigger invalid AI response, verify foutmelding appears with context |
| User can add extra instructions in error state | DATA-02 (D-03) | Requires UI interaction | After error, verify text field appears for extra AI instructions |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
