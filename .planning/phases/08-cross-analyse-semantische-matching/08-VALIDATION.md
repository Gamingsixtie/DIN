---
phase: 8
slug: cross-analyse-semantische-matching
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (if exists) or package.json |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm run build && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm run build && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | CROSS-01 | unit | `npm run build` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | CROSS-02 | unit | `npm run build` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 2 | CROSS-03 | unit | `npm run build` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 2 | CROSS-01 | integration | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Consolidatie-knoppen in UI | CROSS-03 | Visual interaction | Click samenvoeg-knop, verify items merge in UI with undo option |
| Sector-labels bij gedeelde items | CROSS-01 | Visual rendering | Verify each shared element shows sector badges |
| Project-matching resultaten | CROSS-01 | AI output quality | Review AI matching quality for external projects |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
