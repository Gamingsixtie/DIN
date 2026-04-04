---
phase: 12
slug: lopende-projecten-invullen-in-din-netwerk
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build + ESLint (no unit test framework configured) |
| **Config file** | `next.config.ts`, `.eslintrc` (Next.js default) |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | D-03 | build | `npm run build` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | D-01 | build | `npm run build` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 1 | D-01,D-02 | build | `npm run build` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 2 | D-06,D-09 | build | `npm run build` | ✅ | ⬜ pending |
| 12-04-01 | 04 | 3 | D-12,D-14 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No additional test framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI extracts projects from pasted Miro text | D-01 | AI response quality varies | Paste sample klantreis text, verify extracted project names/descriptions are sensible |
| AI suggests project-to-vermogen mappings | D-06, D-09 | AI response quality varies | Confirm project, trigger koppeling, verify suggested vermogens are relevant |
| Warning badge appears for misfit projects | D-13 | AI judgment call | Import a project that doesn't fit DIN scope, verify amber badge appears |
| PDF upload parses correctly | D-01 | File format variation | Upload sample PDF with project descriptions, verify extraction |
| Multi-domain chips render correctly | D-11 | Visual verification | Select multiple domains on a project, verify chips display with correct domain colors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
