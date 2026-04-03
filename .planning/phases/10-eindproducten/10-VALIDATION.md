---
phase: 10
slug: eindproducten
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | Implicit (vitest defaults in package.json) |
| **Quick run command** | `npx vitest run src/lib/__tests__/word-export.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | EXP-01 | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "numbering"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | EXP-01 | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "consolidated"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | EXP-02 | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "flow-table"` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | EXP-03 | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "roadmap"` | ❌ W0 | ⬜ pending |
| 10-01-05 | 01 | 1 | D-13 | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "gap-category"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | D-11 | manual | Manual: click export button, verify modal appears | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/word-export.test.ts` — test stubs for EXP-01, EXP-02, EXP-03, D-13
- [ ] Test fixtures: mock DINSession with consolidated items, completedGoals, and partial chains

*Existing infrastructure covers framework setup (vitest already configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gap-detection modal appears before export | D-11 | UI interaction flow requires browser | 1. Open session with gaps 2. Click "Exporteer" 3. Verify modal shows gaps 4. Click "Toch exporteren" 5. Verify Word downloads |
| Word document visual correctness | EXP-02 | Table styling, numbering, colors require visual inspection | 1. Export document 2. Open in Word 3. Verify numbered headings match TOC 4. Verify tabel-flow tables render correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
