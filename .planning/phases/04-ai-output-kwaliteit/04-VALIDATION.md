---
phase: 4
slug: ai-output-kwaliteit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build (`npm run build`) + manual verification |
| **Config file** | `next.config.ts` |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AI-02 | build | `npm run build` | TBD | ⬜ pending |
| TBD | TBD | TBD | AI-03 | build | `npm run build` | TBD | ⬜ pending |
| TBD | TBD | TBD | AI-04 | build | `npm run build` | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI generates max 2-4 baten per doel per sector | AI-02 | Requires AI API call | Generate DIN-mapping, verify count ≤ 4 |
| KiB context visible in AI prompts | AI-03 | Requires prompt inspection | Check assembleSystemPrompt output includes KiB goals+scope |
| Vergrotende trap in baat titles | AI-04 | Requires linguistic check | Review generated baat titles for comparative form |
| Correction badge appears on corrected items | AI-04 | UI visual check | Trigger correction, verify badge renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
