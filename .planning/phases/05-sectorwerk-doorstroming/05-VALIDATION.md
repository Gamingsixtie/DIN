---
phase: 5
slug: sectorwerk-doorstroming
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DATA-04 | unit | `npx vitest run src/lib/__tests__/sector-migration.test.ts -t "stores typed object"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DATA-04 | unit | `npx vitest run src/lib/__tests__/sector-migration.test.ts -t "migrates legacy"` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | DATA-04 | unit | `npx vitest run src/lib/__tests__/sector-migration.test.ts -t "discards invalid"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | DATA-01 | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "sectorwerk block"` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | DATA-01 | manual | Visual verification in browser | N/A | ⬜ pending |
| 05-02-03 | 02 | 2 | DATA-01 | manual | Visual verification + session inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/sector-migration.test.ts` — stubs for DATA-04 migration logic (typed storage, legacy migration, invalid data discard)
- [ ] `src/lib/__tests__/prompt-assembly.test.ts` — stubs for DATA-01 sectorwerk block formatting (extend existing or create)

*Existing infrastructure covers test framework — Vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Suggestiepaneel renders baten from analysis | DATA-01 | Requires visual browser inspection of React component rendering | 1. Open DIN-mapping step with sector that has analysis 2. Verify inklapbaar panel shows baten-suggesties 3. Verify domain colors are correct |
| Adopted suggestie creates benefit with goalBenefitMap | DATA-01 | Requires UI interaction and session state verification | 1. Click [+] on a suggestie 2. Verify benefit appears in session 3. Verify goalBenefitMap entry created 4. Verify suggestie is visually marked as adopted |
| SectorWerkStep shows structured cards | DATA-04 | Visual layout verification | 1. Complete sectorplan analyse 2. Verify samenvatting card, aansluiting section, baten/vermogens/inspanningen cards 3. Verify domain colors on inspanningen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
