---
phase: 16
slug: supabase-dual-persistence-stabiliteit-sync-en-verificatie
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | D-12 | unit | `npx vitest run src/lib/__tests__/persistence.test.ts` | ✅ | ⬜ pending |
| 16-01-02 | 01 | 1 | D-11 | unit | `npx vitest run src/lib/__tests__/persistence.test.ts` | ✅ | ⬜ pending |
| 16-01-03 | 01 | 1 | D-08 | unit | `npx vitest run src/lib/__tests__/persistence.test.ts` | ✅ | ⬜ pending |
| 16-01-04 | 01 | 1 | D-13 | unit | `npx vitest run src/lib/__tests__/persistence.test.ts` | ✅ | ⬜ pending |
| 16-01-05 | 01 | 1 | D-05 | unit | `npx vitest run src/lib/__tests__/persistence.test.ts` | ✅ | ⬜ pending |
| 16-02-01 | 02 | 2 | D-01/D-02/D-03 | manual | browser test (sync badge color transitions) | N/A | ⬜ pending |
| 16-02-02 | 02 | 2 | D-06 | build+grep | `npm run build && grep -c "saveSessionToSupabase" src/app/page.tsx` | N/A | ⬜ pending |
| 16-03-01 | 03 | 3 | D-09 | unit | `npx vitest run src/lib/__tests__/persistence.test.ts` | ✅ | ⬜ pending |
| 16-03-02 | 03 | 3 | D-10 | manual | browser test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Note on D-12 and D-05 tests:** Originally VALIDATION.md listed `src/lib/__tests__/supabase.test.ts` as a Wave 0 requirement for D-12. This file is unnecessary because Plan 01 Task 2 already creates comprehensive graceful degradation tests (supabase null paths) in `persistence.test.ts`. D-12 is fully covered there. Similarly, D-05 (single-device guarantee) is tested as a dedicated describe block in `persistence.test.ts`.

**Note on SyncStatusFooter tests:** Originally listed `src/components/__tests__/SyncStatusFooter.test.tsx` as a Wave 0 requirement. SyncStatusFooter is a thin presentational component whose correctness is verified by manual browser testing (sync badge color transitions in checkpoint 16-03-02). No separate unit test file needed.

---

## Wave 0 Requirements

No Wave 0 stub files required. All automated tests use the existing `persistence.test.ts` file which Plan 01 Task 2 rewrites with full coverage.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Health-check display on homepage | D-10 | UI rendering + live Supabase connection | Open homepage, verify footer shows connection status, session count, last sync time |
| Sync badge color transitions | D-01/D-02/D-03 | Visual state transitions | Make edit, verify badge goes green→orange→green (or red on failure) |
| Session-list sync on create/delete | D-06 | Requires Supabase connection + browser | Create session, check Supabase dashboard for new row; delete session, verify removed |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are documented as manual-only
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No Wave 0 stub files needed (all tests in persistence.test.ts)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
