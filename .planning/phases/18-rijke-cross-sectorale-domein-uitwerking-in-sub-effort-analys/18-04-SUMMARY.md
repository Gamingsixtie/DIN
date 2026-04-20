---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
plan: 04
completed: 2026-04-20
---

# Plan 18-04 — Summary

## Route stap 4 branch uitbreiding
`src/app/api/cross-analyse/route.ts` regel ~244-262: focus-doel extractie met name-fallback (R5) en rawCaps payload.
Regel ~280-290: `groepVermogensRich` mapping met `profielHuidig` en `profielGewenst`.
Regel ~293-302: `subUserMessage` met `focusDoel` als eerste key en verrijkte vermogens.
Regel ~308: `maxTokens: 4096` → `maxTokens: 8192`.

## Profiel-veldnaam
Bevestigd: `huidieSituatie` (mét spelfout in codebase) en `gewensteSituatie` — gebruikt exact deze spelling in optional chaining.

## Scoping
`rawGoals`, `focusGoal`, `focusDoelContext`, `rawCaps` wonen binnen het `if (stap === 4) { ... }` blok; geen botsing met gelijknamige identifiers in stap 5 branch.

## Verification
- `npm run build` — slaagt zonder errors.
- `grep -c "getFocusGoal" route.ts` = 2 (stap 5 en stap 4 branches).
- `grep -c "maxTokens: 8192" route.ts` = 1.
- `grep -c "maxTokens: 4096" route.ts` = 0.

## Commit
`e0ab24d`
