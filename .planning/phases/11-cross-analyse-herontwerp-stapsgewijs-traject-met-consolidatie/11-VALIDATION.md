---
phase: 11
slug: cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build + TypeScript compiler |
| **Config file** | `tsconfig.json`, `next.config.ts` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | R-CROSS-01 | build | `npx tsc --noEmit` | TBD W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | R-CROSS-01 | build | `npx tsc --noEmit` | TBD W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | R-CROSS-02 | build | `npm run build` | TBD W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — TypeScript compiler and Next.js build are already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wizard navigatie (volgende/vorige) | R-CROSS-01 | UI interaction flow | Navigate through 5 steps, verify unlock logic |
| Per-stap AI-call met cumulatieve context | R-CROSS-01 | AI response quality | Trigger 'Analyseer' per step, verify context accumulates |
| Consolidatie samenvoeg/apart houden | R-CROSS-01 | Interactive merge/undo | Click merge, verify undo, check session state |
| Per-sector vertaling tabs | R-CROSS-02 | Visual layout | Open step 5, verify Overzicht + sector tabs |
| Stakeholder-herkenning (sector-input terugzien) | R-CROSS-02 | UX quality | Verify sector badges on consolidated items |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
